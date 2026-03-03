"""
Extract dominant background color from team member photos.
Samples corners and edges of each image to determine the bg color.
"""
import requests
from PIL import Image
from io import BytesIO
from collections import Counter

team = [
    {"id": "1",  "name": "Dr. M. Venu Gopal",      "url": "https://res.cloudinary.com/dapwxfafn/image/upload/v1772477662/wtuspythd2g4vlcjvngb.jpg"},
    {"id": "3",  "name": "P. Archana",              "url": "https://res.cloudinary.com/dapwxfafn/image/upload/v1772477610/y0rhvcfknqg7pldt5i68.jpg"},
    {"id": "4",  "name": "N. Murari",               "url": "https://res.cloudinary.com/dapwxfafn/image/upload/v1772477662/wtuspythd2g4vlcjvngb.jpg"},
    {"id": "5",  "name": "S. Vijaya Lakshmi",       "url": "https://res.cloudinary.com/dapwxfafn/image/upload/v1772477662/wtuspythd2g4vlcjvngb.jpg"},
    {"id": "6",  "name": "B. Pallavi",              "url": "https://res.cloudinary.com/dapwxfafn/image/upload/v1772477648/kr3tqvfchk4crueraw1q.jpg"},
    {"id": "7",  "name": "T. Hari Teja",            "url": "https://res.cloudinary.com/dapwxfafn/image/upload/v1772477662/wtuspythd2g4vlcjvngb.jpg"},
    {"id": "8",  "name": "H. Adiseshu",             "url": "https://res.cloudinary.com/dapwxfafn/image/upload/v1772472453/waxowu1rwrmac4ofupcd.jpg"},
    {"id": "9",  "name": "G. Akhil",                "url": "https://res.cloudinary.com/dapwxfafn/image/upload/v1772477589/l1okzxtglbjghhe9zdwb.jpg"},
    {"id": "10", "name": "V. Pranav Sai Bhagath",   "url": "https://res.cloudinary.com/dapwxfafn/image/upload/v1772477738/saxzk3jpcgav1zmyylff.jpg"},
    {"id": "11", "name": "P.Kartheek",              "url": "https://res.cloudinary.com/dapwxfafn/image/upload/v1772478843/msjhhdbrgmmhyreai0c0.jpg"},
    {"id": "12", "name": "Harshika",                "url": "https://res.cloudinary.com/dapwxfafn/image/upload/v1772477634/iszrfogf01sgdwe3fl7n.jpg"},
]

def get_bg_color(url, sample_size=40):
    """Download image and extract dominant background color from edges."""
    resp = requests.get(url, timeout=15)
    img = Image.open(BytesIO(resp.content)).convert("RGB")
    w, h = img.size
    
    pixels = []
    # Sample from all four edges (top, bottom, left, right strips)
    for x in range(w):
        for y in range(sample_size):
            pixels.append(img.getpixel((x, y)))  # top
        for y in range(h - sample_size, h):
            pixels.append(img.getpixel((x, y)))  # bottom
    for y in range(h):
        for x in range(sample_size):
            pixels.append(img.getpixel((x, y)))  # left
        for x in range(w - sample_size, w):
            pixels.append(img.getpixel((x, y)))  # right
    
    # Also sample the four corners more heavily (80x80 blocks)
    corner_size = 80
    for x in range(corner_size):
        for y in range(corner_size):
            pixels.append(img.getpixel((x, y)))  # top-left
            pixels.append(img.getpixel((w - 1 - x, y)))  # top-right
            pixels.append(img.getpixel((x, h - 1 - y)))  # bottom-left
            pixels.append(img.getpixel((w - 1 - x, h - 1 - y)))  # bottom-right

    # Quantize to reduce noise: round each channel to nearest 8
    quantized = []
    for r, g, b in pixels:
        quantized.append((r // 8 * 8, g // 8 * 8, b // 8 * 8))
    
    # Find the most common color
    counter = Counter(quantized)
    dominant = counter.most_common(1)[0][0]
    
    # Also compute the average of the top-5 most common colors weighted by count
    top5 = counter.most_common(5)
    total_count = sum(c for _, c in top5)
    avg_r = sum(c[0] * cnt for c, cnt in top5) / total_count
    avg_g = sum(c[1] * cnt for c, cnt in top5) / total_count
    avg_b = sum(c[2] * cnt for c, cnt in top5) / total_count
    
    # Use the dominant color but lighten it slightly for card background
    dr, dg, db = dominant
    # Lighten: blend 40% with white for a soft pastel card bg
    lr = int(dr + (255 - dr) * 0.35)
    lg = int(dg + (255 - dg) * 0.35)
    lb = int(db + (255 - db) * 0.35)
    
    hex_dominant = f"#{dr:02X}{dg:02X}{db:02X}"
    hex_light = f"#{lr:02X}{lg:02X}{lb:02X}"
    
    return hex_dominant, hex_light, (w, h)


print("Analyzing team member photo backgrounds...\n")
print(f"{'ID':>3} | {'Name':<25} | {'Dominant':>10} | {'Card BG':>10} | {'Size'}")
print("-" * 80)

results = {}
for member in team:
    try:
        dominant, card_bg, size = get_bg_color(member["url"])
        results[member["id"]] = card_bg
        print(f"{member['id']:>3} | {member['name']:<25} | {dominant:>10} | {card_bg:>10} | {size[0]}x{size[1]}")
    except Exception as e:
        print(f"{member['id']:>3} | {member['name']:<25} | ERROR: {e}")

print("\n\n--- Copy-paste cardBg values ---")
for mid, bg in results.items():
    print(f"  id '{mid}': cardBg: '{bg}'")
