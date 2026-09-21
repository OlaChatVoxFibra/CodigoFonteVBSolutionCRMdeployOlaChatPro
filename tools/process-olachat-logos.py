from PIL import Image
from collections import deque
from pathlib import Path

root = Path(__file__).resolve().parents[1]
base = root / "frontend" / "src" / "assets"
public = root / "frontend" / "public"


def remove_black_bg(src, dst, threshold=35):
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    visited = [[False] * h for _ in range(w)]
    q = deque()

    def is_bg(x, y):
        r, g, b, a = px[x, y]
        return r <= threshold and g <= threshold and b <= threshold

    seeds = [
        (0, 0),
        (w - 1, 0),
        (0, h - 1),
        (w - 1, h - 1),
        (w // 2, 0),
        (0, h // 2),
        (w - 1, h // 2),
        (w // 2, h - 1),
    ]
    for x, y in seeds:
        if is_bg(x, y):
            q.append((x, y))
            visited[x][y] = True

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                visited[nx][ny] = True
                if is_bg(nx, ny):
                    q.append((nx, ny))
    im.save(dst)
    print("saved", dst, im.size)


remove_black_bg(base / "logo2.png", base / "olachat-logo-light.png")
remove_black_bg(base / "logo clara modo escuro.png", base / "olachat-logo-dark.png")
remove_black_bg(base / "logo3.png", base / "olachat-icon.png")

icon = Image.open(base / "olachat-icon.png").convert("RGBA")
for size, path in [
    (32, public / "favicon-32x32.png"),
    (16, public / "favicon-16x16.png"),
    (192, public / "favicon.png"),
    (180, public / "apple-touch-icon.png"),
    (64, base / "olachat-favicon.png"),
]:
    out = icon.resize((size, size), Image.Resampling.LANCZOS)
    out.save(path)
    print("favicon", path)

icon.save(public / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
icon.resize((64, 64), Image.Resampling.LANCZOS).save(
    base / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)]
)
print("done")
