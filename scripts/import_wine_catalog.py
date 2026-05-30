#!/usr/bin/env python3
"""
import_wine_catalog.py
─────────────────────
Seeds the Supabase wine_catalog table from two datasets:

  1. Kaggle Wine Enthusiast  (130k reviews, critic scores 80-100)
     kaggle datasets download -d zynicide/wine-reviews
     → winemag-data-130k-v2.csv

  2. HuggingFace WineSensed  (824k Vivino reviews, ratings 0-5)
     from datasets import load_dataset
     dataset = load_dataset('Dakhoo/L2T-NeurIPS-2023', 'vintages')

Usage
─────
  pip install pandas requests tqdm datasets kaggle
  export SUPABASE_URL="https://rlgsftutrzwnxbzmzgcx.supabase.co"
  export SUPABASE_SERVICE_KEY="<your service role key>"   # NOT the anon key
  python scripts/import_wine_catalog.py

  # Run only one source:
  python scripts/import_wine_catalog.py --source kaggle
  python scripts/import_wine_catalog.py --source huggingface

  # Dry run (process but don't upload):
  python scripts/import_wine_catalog.py --dry-run
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

import pandas as pd
import requests
from tqdm import tqdm

# ─── Config ───────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://rlgsftutrzwnxbzmzgcx.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
BATCH_SIZE   = 1000      # rows per upsert call
MIN_QUALITY  = 10        # drop wines whose remapped quality_score is below this

KAGGLE_CSV   = Path("data/winemag-data-130k-v2.csv")   # download separately
HF_CACHE     = Path("data/winesensed_cache.parquet")    # cached after first download

# ─── Quality score remapping ──────────────────────────────────────────────────
# Translates inflated critic/community scales to an honest 0-100.
# Wines rated 80 by critics are D-grade; 92+ start to be genuinely good.

_WE_MAP = [
    (75, 8), (78, 15), (80, 23), (82, 33), (84, 42),
    (85, 48), (86, 53), (87, 58), (88, 63), (89, 68),
    (90, 74), (91, 79), (92, 84), (93, 88), (94, 91),
    (95, 94), (97, 96), (99, 99), (100, 100),
]

def we_to_quality(score: float | None) -> int | None:
    """Map Wine Enthusiast 0-100 critic score → honest quality score."""
    if score is None or pd.isna(score):
        return None
    score = float(score)
    if score <= _WE_MAP[0][0]:
        return _WE_MAP[0][1]
    for i in range(len(_WE_MAP) - 1):
        lo_s, lo_q = _WE_MAP[i]
        hi_s, hi_q = _WE_MAP[i + 1]
        if lo_s <= score <= hi_s:
            t = (score - lo_s) / (hi_s - lo_s)
            return round(lo_q + t * (hi_q - lo_q))
    return 100

_VV_MAP = [
    (2.5, 5), (3.0, 22), (3.3, 38), (3.5, 50),
    (3.7, 60), (3.8, 67), (3.9, 72), (4.0, 75),
    (4.1, 80), (4.2, 84), (4.3, 88), (4.4, 91),
    (4.5, 94), (4.7, 97), (5.0, 100),
]

def vivino_to_quality(rating: float | None) -> int | None:
    """Map Vivino 0-5 community rating → honest quality score."""
    if rating is None or pd.isna(rating):
        return None
    rating = float(rating)
    if rating <= _VV_MAP[0][0]:
        return _VV_MAP[0][1]
    for i in range(len(_VV_MAP) - 1):
        lo_r, lo_q = _VV_MAP[i]
        hi_r, hi_q = _VV_MAP[i + 1]
        if lo_r <= rating <= hi_r:
            t = (rating - lo_r) / (hi_r - lo_r)
            return round(lo_q + t * (hi_q - lo_q))
    return 100

# ─── Grape → palate profile lookup ───────────────────────────────────────────
# body / sweetness / tannin / acidity  (all 0-100)
# Rough archetypes — overridden by actual measured values where available.

GRAPE_PALATE = {
    # Reds
    "cabernet sauvignon":   (82, 14, 76, 56),
    "merlot":               (72, 18, 56, 54),
    "pinot noir":           (48, 14, 34, 72),
    "syrah":                (82, 14, 72, 58),
    "shiraz":               (82, 16, 68, 56),
    "malbec":               (80, 16, 66, 60),
    "zinfandel":            (76, 22, 58, 58),
    "tempranillo":          (72, 12, 66, 62),
    "sangiovese":           (72, 10, 70, 68),
    "nebbiolo":             (78, 8,  84, 72),
    "grenache":             (74, 14, 50, 60),
    "gamay":                (40, 12, 28, 72),
    "cabernet franc":       (68, 12, 62, 64),
    "petit verdot":         (80, 10, 78, 62),
    "mourvèdre":            (80, 12, 72, 58),
    "corvina":              (72, 18, 64, 62),
    # Whites
    "chardonnay":           (60, 16, 6,  60),
    "sauvignon blanc":      (40, 10, 3,  80),
    "riesling":             (36, 38, 3,  80),
    "pinot grigio":         (38, 10, 3,  70),
    "pinot gris":           (48, 14, 4,  64),
    "gewürztraminer":       (50, 28, 4,  56),
    "viognier":             (58, 20, 4,  52),
    "albariño":             (40, 10, 3,  78),
    "grüner veltliner":     (44, 10, 4,  74),
    "moscato":              (32, 72, 2,  58),
    "muscat":               (34, 68, 2,  60),
    "chenin blanc":         (44, 24, 4,  74),
    "sémillon":             (52, 20, 4,  60),
    # Sparkling / Rosé
    "champagne blend":      (46, 14, 5,  76),
    "cava blend":           (38, 14, 4,  68),
    "prosecco":             (34, 22, 3,  64),
    "glera":                (34, 22, 3,  64),
    "rosé blend":           (38, 12, 12, 68),
    # Generics / blends
    "red blend":            (72, 20, 58, 54),
    "white blend":          (46, 14, 4,  66),
    "bordeaux blend":       (80, 12, 78, 64),
    "rhône blend":          (76, 14, 64, 60),
    "port blend":           (82, 80, 60, 50),
}

def infer_palate(grape: str | None) -> tuple[int, int, int, int] | tuple[None, None, None, None]:
    if not grape or pd.isna(grape):
        return (None, None, None, None)
    g = grape.lower().strip()
    # Exact match
    if g in GRAPE_PALATE:
        return GRAPE_PALATE[g]
    # First grape in a blend (HuggingFace stores as "Cabernet Sauvignon, Merlot, ...")
    first = g.split(",")[0].strip()
    if first in GRAPE_PALATE:
        return GRAPE_PALATE[first]
    # Substring match
    for key, val in GRAPE_PALATE.items():
        if key in g:
            return val
    return (None, None, None, None)

# ─── Color inference ──────────────────────────────────────────────────────────

_RED_GRAPES    = {"cabernet","merlot","pinot noir","syrah","shiraz","malbec","zinfandel",
                  "tempranillo","sangiovese","nebbiolo","grenache","gamay","movi","corvina",
                  "carmenere","dolcetto","barbera","montepulciano","nero","touriga","mourvèdre"}
_WHITE_GRAPES  = {"chardonnay","sauvignon blanc","riesling","pinot grigio","pinot gris",
                  "gewürztraminer","viognier","albariño","grüner veltliner","moscato","muscat",
                  "chenin blanc","sémillon","vermentino","fiano","greco","verdicchio","trebbiano",
                  "viura","malvasia","torrontés","roussanne","marsanne","godello"}
_SPARKLING     = {"champagne","prosecco","cava","crémant","sekt","espumante","glera","franciacorta"}
_DESSERT       = {"port","sauternes","ice wine","eiswein","tokaji","vin santo","moscato d'asti",
                  "beerenauslese","trockenbeerenauslese","late harvest","muscat"}

def infer_color(grape: str | None, title: str = "") -> str:
    combined = f"{grape or ''} {title}".lower()
    if any(k in combined for k in _SPARKLING):
        return "sparkling"
    if any(k in combined for k in _DESSERT):
        return "dessert"
    if "rosé" in combined or "rose" in combined or "rosado" in combined:
        return "rosé"
    if any(k in combined for k in _WHITE_GRAPES):
        return "white"
    if any(k in combined for k in _RED_GRAPES):
        return "red"
    return "unknown"

# ─── Normalisation helpers ────────────────────────────────────────────────────

_VINTAGE_RE = re.compile(r'\b(19[5-9]\d|20[0-2]\d)\b')

def extract_vintage(text: str | None) -> int | None:
    if not text or pd.isna(text):
        return None
    m = _VINTAGE_RE.search(str(text))
    return int(m.group()) if m else None

def clean_str(s) -> str | None:
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return None
    s = str(s).strip()
    return s if s else None

# ─── Dataset loaders ─────────────────────────────────────────────────────────

def load_kaggle(path: Path) -> pd.DataFrame:
    print(f"\n[kaggle] Loading {path} …")
    df = pd.read_csv(path, usecols=[
        "title", "variety", "winery", "points", "price",
        "region_1", "region_2", "country", "description",
    ])
    print(f"[kaggle] {len(df):,} rows loaded")

    # Quality score — vectorized, filter low-quality rows
    print("[kaggle] Scoring quality …")
    df["quality_score"] = [we_to_quality(p) for p in df["points"]]
    df = df[df["quality_score"].notna() & (df["quality_score"] >= MIN_QUALITY)].reset_index(drop=True)

    # Vintage extraction
    print("[kaggle] Extracting vintages …")
    df["vintage"] = [extract_vintage(t) for t in df["title"]]

    # Palate inference — list comprehension is ~5x faster than iterrows
    print("[kaggle] Inferring palate profiles …")
    palate = [infer_palate(g) for g in df["variety"]]
    df["body"], df["sweetness"], df["tannin"], df["acidity"] = zip(*palate)

    # Color inference
    print("[kaggle] Inferring colors …")
    df["color"] = [infer_color(g, t) for g, t in zip(df["variety"], df["title"])]

    region = df["region_1"].combine_first(df["region_2"])

    result = pd.DataFrame({
        "name":          [clean_str(v) for v in df["title"]],
        "producer":      [clean_str(v) for v in df["winery"]],
        "vintage":       df["vintage"],
        "region":        [clean_str(v) for v in region],
        "country":       [clean_str(v) for v in df["country"]],
        "grape":         [clean_str(v) for v in df["variety"]],
        "color":         df["color"],
        "critic_score":  [int(p) if pd.notna(p) else None for p in df["points"]],
        "vivino_rating": None,
        "quality_score": df["quality_score"],
        "body":          df["body"],
        "sweetness":     df["sweetness"],
        "tannin":        df["tannin"],
        "acidity":       df["acidity"],
        "price_usd":     pd.to_numeric(df["price"], errors="coerce"),
        "description":   [clean_str(v) for v in df["description"]],
        "source":        "kaggle_wine_enthusiast",
        "source_id":     df.index.astype(str),
    })
    result = result[result["name"].notna()].reset_index(drop=True)
    print(f"[kaggle] {len(result):,} rows after filtering (quality ≥ {MIN_QUALITY})")
    return result


def load_huggingface() -> pd.DataFrame:
    if HF_CACHE.exists():
        print(f"\n[huggingface] Loading from cache {HF_CACHE} (delete to re-download) …")
        df = pd.read_parquet(HF_CACHE)
        print(f"[huggingface] {len(df):,} rows loaded from cache")
    else:
        print("\n[huggingface] Downloading Dakhoo/L2T-NeurIPS-2023 vintages (824k rows, may take 10-20 min) …")
        try:
            from datasets import load_dataset  # type: ignore
        except ImportError:
            print("[huggingface] ERROR: install with: pip install datasets")
            return pd.DataFrame()

        ds = load_dataset("Dakhoo/L2T-NeurIPS-2023", "vintages", split="train")
        df = ds.to_pandas()
        print(f"[huggingface] {len(df):,} rows downloaded — caching to {HF_CACHE} …")
        HF_CACHE.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(HF_CACHE, index=False)
        print(f"[huggingface] Cached. Future runs will skip the download.")

    print(f"[huggingface] Columns: {list(df.columns)}")

    # Quality score — vectorized
    print("[huggingface] Scoring quality …")
    df["vivino_rating"] = pd.to_numeric(df.get("rating"), errors="coerce")
    df["quality_score"] = [vivino_to_quality(r) for r in df["vivino_rating"]]
    df = df[df["quality_score"].notna() & (df["quality_score"] >= MIN_QUALITY)].reset_index(drop=True)

    # Name — try "wine" column first, fall back to "name"
    name_col = "wine" if "wine" in df.columns else "name"
    df["_name"] = [clean_str(v) for v in df[name_col]]
    df = df[df["_name"].notna()].reset_index(drop=True)

    # Vintage
    print("[huggingface] Extracting vintages …")
    year_col = df.get("year", pd.Series([None] * len(df)))
    df["vintage"] = [
        int(y) if pd.notna(y) and str(y).isdigit() else None
        for y in year_col
    ]

    # Palate + color — vectorized
    print("[huggingface] Inferring palate profiles …")
    grape_col = df.get("grape", pd.Series([None] * len(df)))
    palate = [infer_palate(g) for g in grape_col]
    df["body"], df["sweetness"], df["tannin"], df["acidity"] = zip(*palate)

    print("[huggingface] Inferring colors …")
    df["color"] = [infer_color(g, n) for g, n in zip(grape_col, df["_name"])]

    winery_col = df.get("winery_id", df.get("winery", pd.Series([None] * len(df))))

    result = pd.DataFrame({
        "name":          df["_name"],
        "producer":      [clean_str(v) for v in winery_col],
        "vintage":       df["vintage"],
        "region":        [clean_str(v) for v in df.get("region", [None] * len(df))],
        "country":       [clean_str(v) for v in df.get("country", [None] * len(df))],
        "grape":         [clean_str(v) for v in grape_col],
        "color":         df["color"],
        "critic_score":  None,
        "vivino_rating": df["vivino_rating"],
        "quality_score": df["quality_score"],
        "body":          df["body"],
        "sweetness":     df["sweetness"],
        "tannin":        df["tannin"],
        "acidity":       df["acidity"],
        "price_usd":     pd.to_numeric(df.get("price", [None] * len(df)), errors="coerce"),
        "alcohol_pct":   pd.to_numeric(df.get("alcohol", [None] * len(df)), errors="coerce"),
        "description":   [clean_str(v) for v in df.get("review", [None] * len(df))],
        "source":        "huggingface_winesensed",
        "source_id":     [str(v) for v in df.get("vintage_id", df.index)],
    })
    print(f"[huggingface] {len(result):,} rows after filtering (quality ≥ {MIN_QUALITY})")
    return result


# ─── Deduplication ────────────────────────────────────────────────────────────

def deduplicate(df: pd.DataFrame) -> pd.DataFrame:
    """
    Keep one row per (normalised_name, vintage).
    When both sources have the same wine, prefer the Kaggle row (critic score
    is more authoritative than community rating) but merge the description
    from HuggingFace if Kaggle has none.
    """
    df = df.copy()
    df["_key"] = (
        df["name"].str.lower().str.strip() + "||" +
        df["vintage"].fillna(0).astype(int).astype(str)
    )

    # Sort: kaggle first (critic score preferred), then huggingface
    source_order = {"kaggle_wine_enthusiast": 0, "huggingface_winesensed": 1, "manual": 2}
    df["_order"] = df["source"].map(source_order).fillna(99)
    df = df.sort_values("_order")

    deduped = df.drop_duplicates(subset="_key", keep="first")
    dropped = len(df) - len(deduped)
    print(f"\n[dedup] {dropped:,} duplicates removed → {len(deduped):,} unique wines")
    return deduped.drop(columns=["_key", "_order"])


# ─── Supabase uploader ────────────────────────────────────────────────────────

def upload(df: pd.DataFrame, dry_run: bool = False) -> None:
    if not SUPABASE_KEY:
        print("\n[upload] ERROR: set SUPABASE_SERVICE_KEY env var")
        sys.exit(1)

    endpoint = f"{SUPABASE_URL}/rest/v1/wine_catalog"
    headers  = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates",  # upsert
    }

    records = df.where(pd.notna(df), None).to_dict(orient="records")
    total   = len(records)
    batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

    print(f"\n[upload] {total:,} rows → {batches} batches of {BATCH_SIZE}")

    if dry_run:
        print("[upload] DRY RUN — skipping actual upload")
        print("[upload] Sample row:", json.dumps(records[0], indent=2, default=str))
        return

    ok = 0
    for i in tqdm(range(0, total, BATCH_SIZE), desc="[upload] Uploading", unit="batch"):
        batch = records[i : i + BATCH_SIZE]
        resp  = requests.post(endpoint, headers=headers, json=batch, timeout=30)
        if resp.status_code not in (200, 201):
            print(f"\n[upload] ERROR on batch {i // BATCH_SIZE + 1}: "
                  f"{resp.status_code} {resp.text[:200]}")
        else:
            ok += len(batch)
        time.sleep(0.05)   # stay under Supabase rate limits

    print(f"[upload] Done — {ok:,} rows upserted")


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Seed wine_catalog from Kaggle + HuggingFace")
    parser.add_argument("--source",  choices=["kaggle", "huggingface", "both"], default="both")
    parser.add_argument("--dry-run", action="store_true", help="Process but don't upload")
    parser.add_argument("--kaggle-csv", default=str(KAGGLE_CSV),
                        help="Path to winemag-data-130k-v2.csv")
    parser.add_argument("--limit", type=int, default=None,
                        help="Cap total rows after dedup (useful for testing, e.g. --limit 5000)")
    args = parser.parse_args()

    frames = []

    if args.source in ("kaggle", "both"):
        csv_path = Path(args.kaggle_csv)
        if not csv_path.exists():
            print(f"""
[kaggle] CSV not found at {csv_path}

Download it first:
  pip install kaggle
  kaggle datasets download -d zynicide/wine-reviews -p data --unzip

Or download manually from:
  https://www.kaggle.com/datasets/zynicide/wine-reviews
""")
            if args.source == "kaggle":
                sys.exit(1)
        else:
            frames.append(load_kaggle(csv_path))

    if args.source in ("huggingface", "both"):
        hf_df = load_huggingface()
        if not hf_df.empty:
            frames.append(hf_df)

    if not frames:
        print("No data loaded — exiting")
        sys.exit(1)

    combined = pd.concat(frames, ignore_index=True)
    combined = deduplicate(combined)

    if args.limit:
        combined = combined.head(args.limit)
        print(f"[limit] Capped to {len(combined):,} rows (--limit {args.limit})")

    # Final stats
    print(f"\n[stats] Total wines ready to upload: {len(combined):,}")
    print(f"[stats] Quality score distribution:")
    bins = [0, 30, 50, 70, 85, 100]
    labels = ["<30 (skip)", "30-49 (poor)", "50-69 (decent)", "70-84 (good)", "85-100 (confident)"]
    cuts = pd.cut(combined["quality_score"].dropna(), bins=bins, labels=labels)
    print(cuts.value_counts().sort_index().to_string())
    print()

    upload(combined, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
