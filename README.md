# 青島八大關 · 海風漫遊

這是以青島市南區八大關為題的 three.js 互動景觀。從山海關路出發，可以沿林蔭街巷走到花石樓、公主樓與第二海水浴場。

## 本機執行

需要 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
```

瀏覽 Vite 顯示的本機網址。執行 `npm run build` 會在 `dist/` 產生靜態網站，可用 `npm run preview` 預覽。

## 部署至 GitHub Pages

在 GitHub 儲存庫的 **Settings → Pages → Build and deployment** 中，將 **Source** 設為 **GitHub Actions**。推送至 `master` 後會自動部署，也可在 **Actions → Deploy to GitHub Pages** 選擇 `master` 手動執行。

工作流程以相對路徑建置 `dist/`，讓網站可在儲存庫子路徑下運作。部署完成後，工作流程會顯示網站網址。

## 操作

| 操作 | 按鍵或手勢 |
| --- | --- |
| 移動 | WASD、方向鍵，或觸控方向鍵 |
| 環顧 | 拖曳滑鼠或觸控滑動。Q／E 左右看，R／F 抬頭和低頭 |
| 快走 | 按住 Shift |
| 前往地標 | 選擇封面景點或景點地圖上的圖釘 |
| 切換光影 | 選擇晴朗午後、金色夕陽或藍調暮色 |

3D 漫遊使用 WebGL 2。場景根據地標、街道植栽與海岸風貌重建，並為步行體驗縮短街區距離與簡化建築外觀。

## 參考資料與素材

- [青島政務網建築介紹](https://www.qingdao.gov.cn/zwgk/xxgk/whly/gkml/gzxx/202601/t20260126_10481040.shtml)
- [青島政務網第二海水浴場](https://www.qingdao.gov.cn/zwgk/xxgk/whly/gkml/gzxx/202606/t20260616_10636451.shtml)
- [山海關路梧桐](https://news.qingdaonews.com/wap/2017-10/27/content_20038167.htm)與[居庸關路銀杏](https://paper.people.com.cn/rmrbhwb/html/2021-11/11/content_25888290.htm)
- 圖庫照片縮圖為 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 授權。花石樓由 Windmemories 拍攝，公主樓由 StefanTsingtauer 拍攝，第二海水浴場由 Antigng 拍攝。原圖連結附於網站的「操作指南」。
- Noto Sans TC 與 Noto Serif TC 使用 SIL Open Font License 1.1。授權文字位於 `public/fonts/`。
- 封面 `public/images/badaguan-cover.webp` 使用內建 ImageGen 生成，畫面為意象圖。

<details>
<summary>封面生成提示</summary>

> Use case: photorealistic-natural. Asset: ultrawide cinematic full-bleed title screen cover for a walking simulator set in Badaguan, Qingdao, China. Wide 16:9 landscape, documentary travel photography feeling. Attractive but entirely believable northern Chinese coastal historic quarter. Camera at pedestrian level on empty grey cobblestone/stone-block seaside lane; road curves from the wide lower center foreground toward the center middle distance. The actual Huashi Villa / Huashilou (花石楼) sits in the left-of-middle background around horizontal position 38 percent, NOT foreground: distinctive modest-scale 1930s European eclectic stone villa with a chunky round grey-granite castellated tower, narrow windows and steep terracotta-roofed gable directly beside it; enclosed by wild coastal gardens. Web headline will overlay left quarter, so leave left quarter relatively subdued with dark shrubbery and shadowed stone boundary walls, no competing detail. Rocky beach corner and calm Yellow Sea open to the right, a low grey seawall edging the lane and wooden old-style posts and rail at right. Wind-bent mature pines and broadleaf trees frame top left and top right, native late-autumn muted ochres and greens. Low sun glows through expressive thin scattered warm peach clouds near distant center-right sea; soft dusk haze over distant wooded headland. Warm gold reflected in irregular old stones, realistic optical texture, wet only in traces, subtle film grain, darker near edges, luminous but not oversaturated, olive, grey and warm champagne palette. No people, cars, modern buildings, signs, logos, UI or lettering. Crisp real-world granite texture and painterly natural light, not a fantasy castle. Scenic sense of depth.

</details>
