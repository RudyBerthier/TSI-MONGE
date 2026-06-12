from PIL import Image
import sys

img = Image.open(sys.argv[1]).convert("RGBA")
datas = img.getdata()

newData = []
# White is (255, 255, 255). We will replace anything close to white.
for item in datas:
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)
img.save(sys.argv[2], "PNG")
