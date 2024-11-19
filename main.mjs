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
async function _Service(req, res){
    //先判斷是不是Banned ip，且如果有用參數傳遞則阻擋
    if(isBannedip(req) || req.url.includes("?")){
        error_return(401, res, true, null);
        return;
    }

    //如果是POST
    if(req.method == "POST"){
        //建立次數檢查器
        let POST_times = 0;

        //建立連線IP
        let clientIPv4 = req.ip || "0.0.0.0";

        //解析xForwardedFor
        const xForwardedFor = req.headers['x-forwarded-for'] || clientIPv4;
        const ips = xForwardedFor.split(',').map(data=>data.trim());
        clientIPv4 = ips.find(ip_list => ip_list.includes('.')) || clientIPv4;

        //檢查POST次數
        for(let i in POST_Requests){
            //如果ip在陣列中，POST_times += 1
            if(clientIPv4.includes(POST_Requests[i]))
                POST_times += 1;
        }

        //取得最後一個POST方法
        const POST_item = req.url.split("/").at(-1);
        //檢查是否是初始化
        if(POST_item == "Check_init"){
            //鎖定目標檔案
            const account_file = `./_Service/Data/account.json`;

            //設定200
            res.writeHead(200, headers_generator('text/plain'));

            //帳號表不存在
            if(!fs.existsSync(account_file)){
                res.write("no account");
                res.end();
                
                return;
            }

            //長度為0
            if(fs.readFileSync(account_file, "utf-8").length <= 0){
                res.write("no account");
                res.end();

                return;
            }
                
            //嘗試讀取
            try{
                //取得帳號數量
                let account_count = JSON.parse(fs.readFileSync(account_file, "utf-8")).length;

                //帳號數量為0
                if(account_count <= 0){
                    res.write("no account");
                    res.end();

                    return;
                }
            }catch{
                //不是JSON
                res.write("no account");
                res.end();

                return;
            }

            //通過就回應有帳號
            res.write("already");
            res.end();

            return;
        }

        //檢查是否是登入
        if(POST_item == "login"){
            //如果POST_times大於伺服器設定的最大上限，429
            if(POST_times > config.max_post){
                error_return(429, res, true, null);
                return;
            }

            //鎖定目標檔案
            const account_file = `./_Service/Data/account.json`;

            //讀取帳號表
            if(!fs.existsSync(account_file)){
                error_return(403, res, true, null);
                return;
            }
            if(fs.readFileSync(account_file, "utf-8").length == 0){
                error_return(403, res, true, null);
                return;
            }

            //建立帳號表
            let account_list;

            //嘗試取得帳號表是否為JSON
            try{
                account_list = JSON.parse(fs.readFileSync(account_file));
            }catch(e){
                if(debug){
                    console.error(e);
                }
                
                error_return(500, res, true, null);
                return;
            }

            //取得Body內容
            let body = '';
            req.on('data', chunk => {body += chunk;});

            //等待完成
            await new Promise(res=>{
                req.on('end', () => {
                    res(true);
                });
            })

            //取的收到的帳號密碼
            const account_table = JSON.parse(atob(body));

            //加密
            const account_Hash = createHash('sha256').update(account_table.account).digest('hex');
            const password_Hash = createHash('sha256').update(account_table.password).digest('hex');

            //逐一掃瞄帳號
            for(let i in account_list){
                if(account_list[i].account == account_Hash && account_list[i].password == password_Hash){
                    //帳號確定後放行
                    res.writeHead(200, headers_generator("text/json"));
                    res.write(`{"status":200, "respone":true, "reason":"none", "UUID":"${account_Hash}.${password_Hash}"}`);
                    res.end();

                    //移除POST冷卻
                    for(let j in POST_Requests){
                        if(POST_Requests[j] == clientIPv4){
                            POST_Requests[j] = null;
                        }
                    }

                    return;
                }
            }

            //未找到匹配帳號
            res.writeHead(200, headers_generator("text/json"));
            res.write(`{"status":200, "respone":false, "reason":"Incorrect account or password."}`);
            res.end();

            //將POST加入至陣列中，防止大量運算破解
            POST_Requests.push(clientIPv4);

            //建立POST冷卻
            setTimeout(()=>{
                POST_Requests = POST_Requests.slice(1, POST_Requests.length);
            }, config.post_cooldown * 1000);

            return;
        }

        //檢查是否是註冊
        if(POST_item == "register"){
            //如果POST_times大於伺服器設定的最大上限，429
            if(POST_times > config.max_post){
                error_return(429, res, true, null);
                return;
            }

            //鎖定目標檔案
            const account_file = `./_Service/Data/account.json`;

            //讀取帳號表
            if(!fs.existsSync(account_file)){
                fs.writeFileSync(account_file, "[]");
            }
            if(fs.readFileSync(account_file, "utf-8").length == 0){
                fs.writeFileSync(account_file, "[]");
            }

            //建立帳號表
            let account_list = [];

            //嘗試取得帳號表是否為JSON
            try{
                account_list = JSON.parse(fs.readFileSync(account_file));
            }catch(e){
                fs.writeFileSync(account_file, "[]");
            }

            //如果帳號已經有了，拒絕此回應
            if(account_list.length >= 1){
                error_return(403, res, true, null);
                return;
            }

            //取得Body內容
            let body = '';
            req.on('data', chunk => {body += chunk;});

            //等待完成
            await new Promise(res=>{
                req.on('end', () => {
                    res(true);
                });
            })  

            //取的收到的帳號密碼
            const account_table = JSON.parse(atob(body));

            //如果帳號長度小於4，回應403
            if(account_table.account.length < 4){
                error_return(403, res, true, null);
                return;
            }

            //如果密碼長度小於8，回應403
            if(account_table.password.length < 8 || account_table.comfirm_password.length < 8){
                error_return(403, res, true, null);
                return;
            }

            //如果是空的，回應403
            if(account_table.account == "" || account_table.password == "" || account_table.comfirm_password == ""){
                error_return(403, res, true, null);
                return;
            }

            //如果密碼跟確認密碼不符合，回應403
            if(account_table.password != account_table.comfirm_password){
                error_return(403, res, true, null);
                return;
            }

            //加密
            const account_Hash = createHash('sha256').update(account_table.account).digest('hex');
            const password_Hash = createHash('sha256').update(account_table.password).digest('hex');

            //存入
            account_list = [
                {
                    ID: account_table.account,
                    account: account_Hash,
                    password: password_Hash
                }
            ];

            //寫入
            fs.writeFileSync(account_file, JSON.stringify(account_list));

            //寫入完成
            res.writeHead(200, headers_generator("text/json"));
            res.write(`{"status":200, "respone":true, "reason":"none", "UUID":"${account_Hash}.${password_Hash}"}`);
            res.end();

            return;
        }

        //Cookies登入
        if(POST_item == "cookies_login"){
            //如果POST_times大於伺服器設定的最大上限，429
            if(POST_times > config.max_post){
                error_return(429, res, true, null);
                return;
            }

            //鎖定目標檔案
            const account_file = `./_Service/Data/account.json`;

            //讀取帳號表
            if(!fs.existsSync(account_file)){
                error_return(403, res, true, null);
                return;
            }
            if(fs.readFileSync(account_file, "utf-8").length == 0){
                error_return(403, res, true, null);
                return;
            }

            //建立帳號表
            let account_list;

            //嘗試取得帳號表是否為JSON
            try{
                account_list = JSON.parse(fs.readFileSync(account_file));
            }catch(e){
                if(debug){
                    console.error(e);
                }
                
                error_return(500, res, true, null);
                return;
            }

            //取得Body內容
            let body = '';
            req.on('data', chunk => {body += chunk;});

            //等待完成
            await new Promise(res=>{
                req.on('end', () => {
                    res(true);
                });
            })

            //取的收到的UUID
            const UUID = atob(body);

            //逐一比對帳號表
            for(let i in account_list){
                let Key = `${account_list[i].account}.${account_list[i].password}`;

                if(UUID == Key){
                    //帳號確定後放行
                    res.writeHead(200, headers_generator("text/json"));
                    res.write(`{"status":200, "respone":true}`);
                    res.end();

                    return;
                }
            }

            //未找到匹配帳號
            res.writeHead(200, headers_generator("text/json"));
            res.write(`{"status":200, "respone":false}`);
            res.end();

            return;
        }

        //頁面請求
        if(POST_item == "page_req" && req.headers.referer.includes("_Service/index.html")){
            //取得Body內容
            let body = '';
            req.on('data', chunk => {body += chunk;});

            //等待完成
            await new Promise(res=>{
                req.on('end', () => {
                    res(true);
                });
            })

            //預設伺服器功能頁
            let service_page = {
                "Dashboard": "Dashboard.html",
                "Rule": "Rule.html",
                "Service": "Service.html",
                "Account": "Account.html"
            }

            //找不到該頁面
            if(service_page[body] == undefined){
                error_return(404, res, true, null);
                return;
            }

            //取得頁面
            const get_page = await file_loader(`_Service/Web/panel_page/${service_page[body]}`);

            //建立回傳資訊陣列
            let write_data = {
                content: get_page,
                append_data: null
            }

            //如果是Rule
            if(body=="Rule"){
                //讀取網頁表
                write_data.append_data = running_url;
            }

            //回傳頁面資訊
            res.writeHead(200, headers_generator("text/json"));
            res.write(JSON.stringify(write_data));
            res.end();

            return;
        }

        //請求資訊
        if(POST_item == "info" && req.headers.referer.includes("_Service/index.html")){
            //請求資訊
            const CPU_info = getCpuUsage();
            const RAM_info = getMemoryUsage();
            const Error_info = getErrorTimes();
            const Rank_info = JSON.stringify(getRank());

            //回傳頁面資訊
            res.writeHead(200, headers_generator("text/json"));
            res.write(`{"CPU":"${CPU_info}","RAM":"${RAM_info}","Forbidden":"${Error_info.Forbidden}","Not_Found":"${Error_info.Not_found}","Reject_requests":"${Error_info.Reject_requests}","Rank":${Rank_info}}`);
            res.end();

            return;
        }

        //儲存規則檔案
        if(POST_item == "upload_rule" && req.headers.referer.includes("_Service/index.html")){
            //取得Body內容
            let body = '';
            req.on('data', chunk => {body += chunk;});

            //等待完成
            await new Promise(res=>{
                req.on('end', () => {
                    res(true);
                });
            });

            //寫入url.json
            fs.writeFileSync("./_Service/Data/url.json", JSON.stringify(JSON.parse(body).data));

            //更改當前路徑
            running_url = JSON.parse(body).data;

            //如果有delete_ID
            if(JSON.parse(body).delete_ID != null){
                //取得排行榜
                let rank_list = JSON.parse(fs.readFileSync("./_Service/Data/page_rank.json"));

                //移除rank_list
                delete rank_list[JSON.parse(body).delete_ID];

                //過濾，將undefiend移除
                rank_list = rank_list.filter(item => item !== undefined);
                rank_list = rank_list.filter(item => item !== null);

                //寫入排行榜
                fs.writeFileSync("./_Service/Data/page_rank.json", JSON.stringify(rank_list));
            }

            //回傳頁面資訊
            res.writeHead(200, headers_generator("text/json"));
            res.end();

            return;
        }
    }

    //移除Server
    res.removeHeader("Server");

    //建立無參數的正確網址
    const clear_url = req.url.split("?")[0];
    //建立正確路徑正確引導
    let file_path = clear_url.split("/");
    file_path = file_path.slice(2, file_path.length).join("/");
    file_path = `/_Service/Web/${file_path}`;

    //如果只有根目錄
    if(clear_url == "/_Service" || clear_url == "/_Service/"){
        res.writeHead(200, headers_generator('text/html'));
        res.write(await file_loader(`./_Service/Web/login.html`));
        res.end();

        return;
    }
    
    //判斷檔案存在
    if(!fs.existsSync(`.${file_path}`)){
        error_return(404, res, true, null);
        return;
    }

    if(req.headers.referer == undefined && !clear_url.endsWith(".html")){
        error_return(403, res, true, null);
        return;
    }

    if(clear_url.endsWith(".css"))
        res.writeHead(200, headers_generator('text/css'));
    else if(clear_url.endsWith(".html"))
        res.writeHead(200, headers_generator('text/html'));
    else if(clear_url.endsWith(".js"))
        res.writeHead(200, headers_generator('text/javascript'));
    else if(clear_url.endsWith(".jpg"))
        res.writeHead(200, headers_generator('image/jpeg'));
    else if(clear_url.endsWith(".png"))
        res.writeHead(200, headers_generator('image/png'));
    else if(clear_url.endsWith(".ico"))
        res.writeHead(200, headers_generator('image/x-icon'));
    else {
        error_return(403, res, true, null);
        return;
    }

    res.write(await file_loader(`.${file_path}`));
    res.end();

    return;
}

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

    //系統服務
    if(req_dir == "_Service"){
        _Service(req, res);
        return;
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
                
                //執行該檔案的Liminal_main函數
                const result = await POST_file.Liminal_main(req, param_object);

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
        if((req_dir == running_url[i].url || running_url[i].url == "") && running_url[i].Disable == false){
            //取得排行榜
            let rank_list = JSON.parse(fs.readFileSync("./_Service/Data/page_rank.json"));

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
                    
                    //執行該檔案的Liminal_main函數
                    const result = await POST_file.Liminal_main(req, param_object);

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
    if(fs.existsSync(`${error_page}`)){
        //存在就將錯誤網頁顯示
        res.writeHead(error_code, headers_generator("text/html"));
        res.write(await file_loader(`${error_page}`));  
        res.end('');

        return true;
    }

    //不存在就僅顯示文字
    res.writeHead(error_code, headers_generator("text/plain"));
    res.write(`error code : ${error_code}.`);
    res.end('');

    return true;
}

function isBannedip(req){
    //建立連線IP
    let clientIPv4 = req.ip || "0.0.0.0";

    //解析xForwardedFor
    const xForwardedFor = req.headers['x-forwarded-for'] || clientIPv4;
    const ips = xForwardedFor.split(',').map(data=>data.trim());
    clientIPv4 = ips.find(ip_list => ip_list.includes('.')) || clientIPv4;

    //debug
    if(debug){
        console.log(req.ip);
        console.log(req.connection.remoteAddress);
        console.log(xForwardedFor);
        console.log(ips);
        console.log(clientIPv4);
    }

    //逐一排查IP
    for(let selectIP in banned_ip){
        //這裡使用反向放法是因為怕IPv6
        if(clientIPv4.includes(banned_ip[selectIP])){
            //IP存在
            return true;
        }
    }

    //不存在的IP
    return false;
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

//取的CPU使用率
function getCpuUsage() {
    //取得CPU總數量
    const cpus = os.cpus();

    //建立一個陣列，用於儲存每顆核心的使用量
    let cpu_usage_array = [];

    //逐一建立
    for(let i in cpus){
        const total = Object.values(cpus[i].times).reduce((acc, cv) => acc + cv, 0) ;
        const current = (process.cpuUsage().user + process.cpuUsage().system) * 1000;

        const result = (current / total * 100).toFixed(2);

        cpu_usage_array.push(parseFloat(result));
    }

    //建立結果
    let total_usage = cpu_usage_array.reduce((acc, cv) => acc + cv, 0) / 4;

    return `${total_usage.toFixed(1)}%`;
}

//取得記憶體資訊
function getMemoryUsage(){
    //建立可用和已用
    let totalMemory, usedMemory;

    try {
        //取得RAM上限值 (Docker)
        const memoryLimit = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8');
        //取得RAM使用率 (Docker)
        const memoryUsage = fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf8');

        //轉換為GB
        totalMemory = memoryLimit / 1024 / 1024 / 1024;
        usedMemory = memoryUsage / 1024 / 1024 / 1024;
    } catch (error) {   //不是Docker的情況下
        //取得RAM上限值 
        totalMemory = os.totalmem() / 1024 / 1024 / 1024;
        //取得RAM使用率
        usedMemory = (os.totalmem() - os.freemem()) / 1024 / 1024 / 1024;
    }

    //回傳正確格式
    return `${usedMemory.toFixed(1)}/${totalMemory.toFixed(1)} GB`;
};

function getErrorTimes(){
    //建立資料
    let data;

    //讀取檔案
    try{
        data = JSON.parse(fs.readFileSync("./_Service/Data/error_counter.json"));
    }catch(e){
        console.log("Error counter fetch error!");
        data = {
            "Forbidden":0,
            "Not_found":0,
            "Reject_requests":0
        }
    }
    

    return data;
}

function getRank(){
    //建立資料
    let data;

    //讀取檔案
    try{
        data = JSON.parse(fs.readFileSync("./_Service/Data/page_rank.json"));
    }catch(e){
        console.log("Error rank fetch error!");
        data = [];
    }

    //建立新資料
    let new_data = [];

    //逐一處理檔案，將ID轉換成網頁資訊
    for(let i in data){
        //逐一取得網頁資訊
        for(let j in running_url){
            //Debug
            if(debug){
                console.log(data[i]);
                console.log(running_url[j]);
                console.log("=====");
            }

            //如果ID一樣
            if(data[i].ID == running_url[j].ID){
                //推入新格式
                new_data.push({
                    dir: running_url[j].url,
                    connection: data[i].connection,
                    requests: data[i].requests,
                    reject: data[i].reject
                });
                
                //離開本For
                break;
            }
        }
    }

    //建立暫存
    let cache;

    //逐一排序，氣泡
    for(let i in new_data){
        for(let j = i; j < new_data.length; j++){
            //如果自己比自己就跳過
            if(i==j)
                continue;
            
            //如果比較的比被比較的大
            if(new_data[j].connection > new_data[i].connection){
                //存入快取
                cache = new_data[i];

                //將比較的放入資料中
                new_data[i] = new_data[j];

                //將快取移動回來
                new_data[j] = cache;

                cache = null;
            }
        }
    }

    return new_data;
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