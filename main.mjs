//modules 模塊
import * as http from 'http';           //http      - website service
import fs from "fs"                     //fs        - file system
import {createRequire} from 'module';   //module    - require on ES6
import { createHash } from 'crypto';    //crypto    - crypto service
import os from 'os';                    //os        - system information


//base setting 底層設定
const require = createRequire(import.meta.url);             //補齊ES6無法原生支援require

//golbal variable 全域變數
const debug = false;                //除錯模式

let config = {};                    //讀取網頁config

let banned_ip = [];                 //封鎖的IP

let running_url = [];               //當前正在運行的網頁

let extension_type_object = {};     //副檔名回傳物件類型

let POST_Requests = [];             //紀錄速率用

//element declare 元件宣告
const service = http.createServer();    //http元件，網頁服務用
await service_init();                   //伺服器初始化

//funtion declare 函數宣告
service.addListener("request", async (req, res) => {
    //移除Server
    res.removeHeader("Server");

    //建立無參數的正確網址
    let clear_url = req.url.split("?")[0];

    //如果網址後面沒有斜線，那要重新導向到/，確保資源存取正確
    if(!clear_url.includes(".") && !clear_url.endsWith("/") && req.method == "GET"){
        res.writeHead(302, { 'Location': `${clear_url}/` });
        res.end();

        return;
    }

    //建立要求的目錄
    let req_dir = clear_url.split("/")[1] || "/";

    //debug
    if(debug){
        console.log(clear_url);
        console.log(req_dir);
    }

    //如果是folder mode(資料夾直接存取)
    if(config.folder_mode){
        //如果找不到檔案
        if(!fs.existsSync(`.${clear_url}`)){
            await error_return(404, res);
            return;
        }

        //如果是.js，且有啟用js服務回應
        if(clear_url.endsWith(".js") && config.folder_allow_script){
            //取得參數
            let clear_param = req.url.split("?");
            clear_param[0] = "";

            //完整參數
            const full_param = clear_param.join("");

            //將參數切分
            let param = full_param.split("&");

            //分解參數對象
            let param_object = {};

            //分解參數
            for(let j in param){
                param_object[param[j].split("=")[0]] = decodeURIComponent(param[j].split("=")[1])||"";
            }

            //嘗試連接接口
            try{
                //優先清除快取，避免後續檔案讀取問題
                delete require.cache[require.resolve(`.${clear_url}`)];

                //require該檔案
                let POST_file = require(`.${clear_url}`);
                
                //執行該檔案的MSP_main函數
                const result = await POST_file.MSP_main(req, param_object);

                //將回應轉換為字串
                const result_string = result?.toString();

                //判斷空值
                if(result_string != undefined){
                    //如果成功，那麼就send回去
                    res.writeHead(200, headers_generator("text/plain"));
                    res.write(result?.toString());
                    res.end();
                }else{
                    //如果是空值，那麼就回應500
                    await error_return(500, res);
                }

                //清除require快取
                delete require.cache[require.resolve(`.${clear_url}`)];
                POST_file = null;

                return;
            }catch(e){
                //失敗的話就無視
                if(debug){
                    console.log("failed fetch");
                    console.log(e);
                }
            }
        }

        //將所有副檔名轉為陣列長度
        const extension_type_object_keys = Object.keys(extension_type_object);

        //逐一掃瞄
        for(let i in extension_type_object_keys.length){
            //如果核對正確
            if(clear_url.endsWith(extension_type_object_keys[i])){
                res.writeHead(200, headers_generator(extension_type_object[extension_type_object_keys[i]]));
                res.write(file_loader(`.${clear_url}`));
                res.end();
                return;
            }
        }

        res.writeHead(200, headers_generator("text/plain"));
        res.write(await file_loader(`${clear_url.replace("/","")}`));
        res.end();
        return;
    }

    //開始掃描啟用目錄
    for(let i in running_url){
        //如果符合啟用目錄方法，或者根目錄對外開放
        if(req_dir == running_url[i].url || running_url[i].url == ""){
            //取得排行榜
            const rank_list = JSON.parse(fs.readFileSync("./_Service/Data/page_rank.json"));

            //鎖定排行榜位置
            let rank_pos = null;

            //逐一查詢
            for(let j in rank_list){
                if(rank_list[j].ID == running_url[i].ID){
                    rank_pos = j;
                    break;
                }
            }

            //如果位置是null，則新增
            if(rank_pos == null){
                //先取得長度，作為座標
                rank_pos = rank_list.length;

                //推入新資料
                rank_list.push({
                    "ID": running_url[i].ID,
                    "connection": 0,
                    "requests": 0,
                    "reject": 0
                })
            }

            //建立要求的檔案，將根目錄移除
            let req_file_array = clear_url.split("/");
            req_file_array = req_file_array.slice(2, req_file_array.length);

            //將陣列組合
            let req_file;

            if(running_url[i].url == "" && running_url[i].target == ""){
                req_file = clear_url;
            } else if(running_url[i].url == "" && running_url[i].target != "") {
                req_file = `/${running_url[i].target}/${clear_url}`;
            } else {
                req_file = `/${running_url[i].target}/${req_file_array.join("/")}`;
            }

            //如果要求的檔案不是正確檔案，將其引導為index.html
            if(!req_file.includes(".") && req.method == "GET")
                req_file = req_file + "/index.html";

            //如果找不到檔案
            if(!fs.existsSync(`.${req_file}`)){
                //拒絕回傳+1
                rank_list[rank_pos].reject += 1;

                //寫入排行榜
                fs.writeFileSync("./_Service/Data/page_rank.json", JSON.stringify(rank_list));

                await error_return(404, res, false, running_url[i]);
                return;
            }

            //如果是.js，且有啟用js服務回應
            if(clear_url.endsWith(".js") && running_url[i].allow_script){
                //取得參數
                let clear_param = req.url.split("?");
                clear_param[0] = "";

                //完整參數
                const full_param = clear_param.join("");

                //將參數切分
                let param = full_param.split("&");

                //分解參數對象
                let param_object = {};

                //分解參數
                for(let j in param){
                    param_object[param[j].split("=")[0]] = decodeURIComponent(param[j].split("=")[1])||"";
                }

                //嘗試連接接口
                try{
                    //優先清除快取，避免後續檔案讀取問題
                    delete require.cache[require.resolve(`.${req_file}`)];

                    //require該檔案
                    let POST_file = require(`.${req_file}`);
                    
                    //執行該檔案的MSP_main函數
                    const result = await POST_file.MSP_main(req, param_object);

                    //將回應轉換為字串
                    const result_string = result?.toString();

                    //判斷空值
                    if(result_string != undefined){
                        //建立連線+1
                        rank_list[rank_pos].connection += 1;

                        //寫入排行榜
                        fs.writeFileSync("./_Service/Data/page_rank.json", JSON.stringify(rank_list));

                        //如果成功，那麼就send回去
                        res.writeHead(200, headers_generator("text/plain"));
                        res.write(result?.toString());
                        res.end();
                    }else{
                        //拒絕回傳+1
                        rank_list[rank_pos].reject += 1;

                        //寫入排行榜
                        fs.writeFileSync("./_Service/Data/page_rank.json", JSON.stringify(rank_list));

                        //如果是空值，那麼就回應500
                        await error_return(500, res);
                    }

                    //清除require快取
                    delete require.cache[require.resolve(`.${req_file}`)];
                    POST_file = null;

                    return;
                }catch(e){
                    //失敗的話就無視
                    if(debug){
                        console.log("failed fetch");
                        console.log(e);
                    }
                }
            }
            
            //如果不允許直通
            if(((req.headers.referer == undefined && !req_file.endsWith(".html")) || req.method == "POST") && !running_url[i].direct_access){
                //拒絕回傳+1
                rank_list[rank_pos].reject += 1;

                //寫入排行榜
                fs.writeFileSync("./_Service/Data/page_rank.json", JSON.stringify(rank_list));

                await error_return(403, res, false, running_url[i]);
                return;
            }

            //建立服務允許通訊類型
            const allow_extension_key = Object.keys(running_url[i].allow_extension);

            //逐一掃瞄允許類型
            for(let j in allow_extension_key){
                //建立允許類型的副檔名
                const allow_extension_name = `.${allow_extension_key[j]}`;

                //如果網址的請求包括在允許的類型中
                if(req_file.endsWith(allow_extension_name)){
                    //建立回傳類別
                    let return_type;

                    //檢查類型回傳是否為預設
                    if(running_url[i].allow_extension[allow_extension_key[j]].type == "default"){
                        return_type = extension_type_object[allow_extension_name]||"text/plain";
                    }else{
                        return_type = running_url[i].allow_extension[allow_extension_key[j]].type;
                    }

                    //如果是referer
                    if(req.headers.referer){
                        //建立資源請求+1
                        rank_list[rank_pos].requests += 1;
                    } else {
                        //建立連線+1
                        rank_list[rank_pos].connection += 1;
                    }
                    

                    //寫入排行榜
                    fs.writeFileSync("./_Service/Data/page_rank.json", JSON.stringify(rank_list));

                    //回傳
                    res.writeHead(200, headers_generator(return_type));
                    res.write(await file_loader(req_file));
                    res.end();

                    return;
                }
            }

            //拒絕回傳+1
            rank_list[rank_pos].reject += 1;

            //寫入排行榜
            fs.writeFileSync("./_Service/Data/page_rank.json", JSON.stringify(rank_list));
        }
    }

    //沒有配對的目錄，拒絕訪問
    await error_return(403, res, false, null);
    return;
})

service.listen(config.running_port, () => {
    //清空控制台
    console.clear();

    //顯示版本資訊
    console.log(`Server has running on http://localhost:${config.running_port}`);
})

//custom funtion declare 自定義函數宣告
//錯誤頁面回應函數
async function error_return(error_code, res, Service_input, page_data){
    //讀取錯誤表資料庫
    let error_counter = JSON.parse(await fs.readFileSync('./_Service/Data/error_counter.json', "utf-8"));

    if(Service_input){
        //不做任何事情
    } else if (error_code == 403){
        error_counter.Forbidden += 1;
        fs.writeFileSync('./_Service/Data/error_counter.json', JSON.stringify(error_counter));
    } else if (error_code == 404){
        error_counter.Not_found += 1;
        fs.writeFileSync('./_Service/Data/error_counter.json', JSON.stringify(error_counter));
    } else if (error_code == 429){
        error_counter.Reject_requests += 1;
        fs.writeFileSync('./_Service/Data/error_counter.json', JSON.stringify(error_counter));
    }

    //逐一檢查錯誤自訂頁面
    if(page_data != null){
        //取得自訂的錯誤網頁
        const custom_error_page = page_data.error[`${error_code}`];

        //如果不是undefiend
        if(custom_error_page){
            //檢測檔案是否存在
            if(fs.existsSync(`./${page_data.target}/${custom_error_page}`)){
                //存在就將錯誤網頁顯示
                res.writeHead(error_code, headers_generator("text/html"));
                res.write(await file_loader(`${page_data.target}/${custom_error_page}`));
                res.end('');
        
                return true;
            }
        }
    }

    //取的錯誤網頁
    const error_page = config.error[`${error_code}`];

    //檢查是否有存在錯誤網頁
    if(fs.existsSync(`./_Service/Error/${error_page}`)){
        //存在就將錯誤網頁顯示
        res.writeHead(error_code, headers_generator("text/html"));
        res.write(await file_loader(`./_Service/Error/${error_page}`));
        res.end('');

        return true;
    }

    //不存在就僅顯示文字
    res.writeHead(error_code, headers_generator("text/plain"));
    res.write(`error code : ${error_code}.`);
    res.end('');

    return true;
}


//header生成器
function headers_generator(contentType){
    if(contentType.includes("text")){
        return {
            'Content-Type': `${contentType}; charset=utf-8`,
            'Cache-Control': 'max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    }

    if(contentType.includes("font")){
        return {
            'Content-Type': `${contentType};`,
            'Cache-Control': 'public, max-age=31536000'
        }
    }

    return {
        'Content-Type': contentType,
        'Cache-Control': 'max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
}

//檔案讀取器
async function file_loader(path) {
    //取得副檔名
    const file_extension = `.${path.split(".").at(-1)}`;
    const extension_type = extension_type_object[file_extension];

    //debug
    if(debug){
        console.log(file_extension);
        console.log(extension_type);
        console.log(path);
    }

    //建立結果
    let result;

    //如果是文字檔
    if(extension_type.includes("text"))
        result = fs.readFileSync(`./${path}`, "utf-8");
    else
        result = fs.readFileSync(`./${path}`);

    //回傳
    return result;
}

//config讀取器
async function config_loader(){
    //讀取config.json
    const _file = await fs.readFileSync(`./_Service/Data/config.json`);

    //回傳JSON
    return JSON.parse(_file);
}

//url讀取器
async function url_loader(){
    //讀取url.json
    const _file = await fs.readFileSync(`./_Service/Data/url.json`);

    //回傳JSON
    return JSON.parse(_file);
}

//副檔名類型讀取器
async function extension_type_loader() {
    //讀取extension_type.json
    const _file = await fs.readFileSync(`./_Service/Data/extension_type.json`);
    const _content = JSON.parse(_file);

    //建立結果物件
    let result = {};

    //轉換為物件
    for(let x in _content){
        result[_content[x].extension] = _content[x].type;
    }

    //回傳修正後的物件
    return result;
}

//伺服器初始化
async function service_init() {
    config = await config_loader();                         //讀取網頁config

    banned_ip = config.banned_ip;                           //封鎖的IP

    running_url = await url_loader();                       //讀取運行的url

    extension_type_object = await extension_type_loader();  //讀取副檔名類型

    return;
}

//test 測試區塊
//console.log(__dirname);             //測試__dirname正常運作