<div align="center">
<h1>NetMSP</h1>
<p>使用nodejs架設一個網頁服務器</p>
<sub>更簡單的在nodejs中架設網頁。</sub>
<p></p>
</div>

  

<div align="center">

![Language](https://badgen.net/badge/語言/Javascript/orange)
![Version](https://badgen.net/badge/Node版本/v20.17.0/green)

</div>


# 尚未公開
這是一個尚未完成的項目，請等等...


# NetMSP Beta v1

基於Nodejs框架打造的網頁管理器

浪費了我人生的24小時，就為了方便以後架js的網頁

原本想說用Expressjs寫，後面發現用原生的http也可以

為了避免一堆問題我就跑回去開原生了

~~(我他媽小到一半才知道原生可以用，快爆炸了)~~

總之，這東西方便易用

然後為了搞定伺服器端運行，我還讓他可以運行nodejs (伺服器端)

總算是補足了不能使用php的痛點。

~~(鬼才知道我浪費多少時間在處理這個)~~


# 運行需求
- [Nodejs v20](https://nodejs.org/en)


# 測試環境
- Linux ( ubuntu LTS22.04 )


# 伺服器框架
跟以往伺服器請求使用的php不一樣

使用的是nodejs，且限定 CommonJS (第一版饒了我拜託)

~~(還可以使用伺服器端跑Discord Bot WTF)~~


# Javascript檔案
每個要讓伺服器運行的 ``.js`` 規格應當如下

一個 ``MSP_main`` 函數，接收 ``req`` 和 ``param`` 兩個參數


``./test/test.js``
```js
async function MSP_main(req, param){
	return "Hello World";
}

module.exports = {
	MSP_main : MSP_main
}
```
接下來進入``localhost:51000/test/test.js``
應該就會看到它輸出的 Hello World 了

Next~


# 基礎運行
請檢查 ``url.json``
裡面的範例格式應該看得懂
| 物件 | 用途 |
|---|---|
| name | 網頁版辨識用服務名稱 |
| url | 瀏覽器網址 |
| target | 目標資料夾 |
| direct_access | 允許直接透過網址存取? |
| allow_extension | 允許的類型 (default 系統會使用預設) |


# 如何運行
``node ./main.mjs``

加油吧，孩子

我以後還會回來更新的

歡迎提issue


# 感謝
非常感謝 nodejs 的開發者

還有我的大腦。
