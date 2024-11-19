//暫存，存放規則、伺服器資訊、帳號用
let cache;

//暫存快取旗標
let cache_flag;

//新暫存，存放新增的規則
let cache_new;

//暫存，當前頁面
let cache_page;

window.addEventListener('load', async ()=>{
    //檢查Cookies
    if(getCookies("auth")){
        const cookies_status = await fetch("./cookies_login",{
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: btoa(getCookies("auth"))
        });

        //取出資料
        let cookies_data = await cookies_status.text();

        if (!cookies_status.ok || !JSON.parse(cookies_data).respone){
            alert("Auth key is expires.");
            deleteCookies("auth");
            window.location = "login.html";
        }
    } else {
        window.location = "login.html";
    }

    //顯示儀錶板
    await page_req('Dashboard');

    //開始更新伺服器資訊
    setInterval(()=>{
        load_service_info();
    }, 60000);
});

window.addEventListener('resize', async()=>{
    document.querySelector(".center").setAttribute("class", "center");
})

async function show_selection(){
    const center_show = document.querySelectorAll(".center.show");

    if(center_show.length == 0){
        document.querySelector(".center").setAttribute("class", "center show");
    }else{
        document.querySelector(".center.show").setAttribute("class", "center");
    }
}

async function logout(){
    const sure = confirm("Did you sure you want logout?");
    if(sure){
        deleteCookies("auth");
        window.location = "login.html";
    }
}

async function page_req(page) {
    cache = null;

    document.querySelector('[Liminal-WM-item="panel-element"]').setAttribute("class", "switch");
    document.querySelector('[Liminal-WM-item="panel-element"]').innerHTML = "";

    const page_fetch = await (await fetch("./page_req",{
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: page
    })).json();

    document.querySelector('[Liminal-WM-item="panel-element"]').innerHTML = page_fetch.content;
    document.querySelector('[Liminal-WM-item="panel-element"]').removeAttribute("class");

    cache = page_fetch.append_data;
    cache_page = page;

    load_service_info();
    load_rule();
}

async function load_service_info() {
    let Liminal_CPU = document.querySelectorAll('[Liminal-WM-item="CPU"]');
    let Liminal_RAM = document.querySelectorAll('[Liminal-WM-item="RAM"]');
    let Liminal_403 = document.querySelectorAll('[Liminal-WM-item="403"]');
    let Liminal_404 = document.querySelectorAll('[Liminal-WM-item="404"]');
    let Liminal_429 = document.querySelectorAll('[Liminal-WM-item="429"]');
    let Liminal_Ranking = document.querySelectorAll('[Liminal-WM-item="Ranking"]');

    if( Liminal_CPU.length && 
        Liminal_RAM.length && 
        Liminal_403.length && 
        Liminal_404.length && 
        Liminal_429.length &&
        Liminal_Ranking.length){

        const info = await (await fetch("./info", {
            method: 'POST'
        })).json();

        document.querySelector('[Liminal-WM-item="CPU"] > .number').innerHTML = info.CPU;
        document.querySelector('[Liminal-WM-item="RAM"] > .number').innerHTML = info.RAM;
        document.querySelector('[Liminal-WM-item="403"] > .number').innerHTML = info.Forbidden;
        document.querySelector('[Liminal-WM-item="404"] > .number').innerHTML = info.Not_Found;
        document.querySelector('[Liminal-WM-item="429"] > .number').innerHTML = info.Reject_requests;

        document.querySelector('[Liminal-WM-item="Ranking"] > table').innerHTML = `<tbody><tr class="name"><td>Rank</td><td>Dictionary</td><td>Connections</td><td>Resource requests</td><td>Resource Reject</td></tr></tbody>`;

        for(let i in info.Rank){
            let rank_list = document.querySelector('[Liminal-WM-item="Ranking"] > table > tbody');

            let new_tr = document.createElement("tr");

            new_tr.innerHTML += `<td>${parseInt(i) + 1}</td>`;
            new_tr.innerHTML += `<td>${info.Rank[i].dir}</td>`;
            new_tr.innerHTML += `<td>${info.Rank[i].connection}</td>`;
            new_tr.innerHTML += `<td>${info.Rank[i].requests}</td>`;
            new_tr.innerHTML += `<td>${info.Rank[i].reject}</td>`;

            rank_list.appendChild(new_tr);
        }
    }

    return;
}

async function load_rule() {
    let rule_table = document.querySelectorAll('[Liminal-WM-item="Rule"]');

    if(rule_table.length){
        document.querySelector('[Liminal-WM-item="Rule"] > table').innerHTML = `<tbody><tr class="name"><td>Setting</td><td>Name</td><td>Dictionary</td><td>Target</td><td>Script</td></tr></tbody>`;

        for(let i in cache){
            let rule_list = document.querySelector('[Liminal-WM-item="Rule"] > table > tbody');

            let new_tr = document.createElement("tr");

            new_tr.innerHTML += `<td><a onclick="modify(${i}, 'rule')">Modify</a></td>`;
            new_tr.innerHTML += `<td>${cache[i].name}</td>`;
            new_tr.innerHTML += `<td>${cache[i].url}</td>`;
            new_tr.innerHTML += `<td>${cache[i].target}</td>`;
            new_tr.innerHTML += `<td>${cache[i].allow_script}</td>`;

            rule_list.appendChild(new_tr);
        }
    }
}

async function modify(pos, mod) {
    if(mod == "rule"){
        if(pos == -1){
            let maxID = 0;

            for(let i in cache){
                if(maxID < cache[i].ID){
                    maxID = cache[i].ID;
                }
            }

            maxID += 1;

            cache_new = JSON.parse(JSON.stringify({
                "name" : "",
                "url" : "",
                "target" : "",
                "direct_access" : true,
                "allow_script" : true,
                "allow_extension" : {
                    "html":{
                        "type":"default"
                    },
                    "css":{
                        "type":"default"
                    },
                    "js":{
                        "type":"default"
                    }
                },
                "error":{},
                "ID": maxID,
                "Disable": false
            }));

            cache_flag = cache_new.ID;

            document.querySelector('[Liminal-WM="title"]').innerHTML = `create new rule`;

            document.querySelector('[Liminal-WM="id"]').innerHTML = cache_new.ID + " (new)";
            document.querySelector('[Liminal-WM="disable"]').checked = cache_new.Disable;
            document.querySelector('[Liminal-WM="name"]').value = cache_new.name;
            document.querySelector('[Liminal-WM="url"]').value = cache_new.url;
            document.querySelector('[Liminal-WM="target"]').value = cache_new.target;
            document.querySelector('[Liminal-WM="direct_access"]').checked = cache_new.direct_access;
            document.querySelector('[Liminal-WM="allow_script"]').checked = cache_new.allow_script;

            document.querySelector('[Liminal-WM="error_page"]').innerHTML = `<tbody><tr><td>Code</td><td>Page</td><td>Modifiy</td></tr></tbody>`;

            document.querySelector('[Liminal-WM="allow_type"]').innerHTML = `<tbody><tr><td>Extension</td><td>Content-type</td><td>Modifiy</td></tr></tbody>`;
            document.querySelector('[Liminal-WM="delete_rule"]').setAttribute("style", "display:none");
        } else {
            console.log(cache);
            cache_new = cache_new = JSON.parse(JSON.stringify(cache[pos]));

            cache_flag = pos;

            document.querySelector('[Liminal-WM="title"]').innerHTML = `editing ${cache_new.name} rule`
        
            document.querySelector('[Liminal-WM="id"]').innerHTML = cache_new.ID;
            document.querySelector('[Liminal-WM="disable"]').checked = cache_new.Disable;
            document.querySelector('[Liminal-WM="name"]').value = cache_new.name;
            document.querySelector('[Liminal-WM="url"]').value = cache_new.url;
            document.querySelector('[Liminal-WM="target"]').value = cache_new.target;
            document.querySelector('[Liminal-WM="direct_access"]').checked = cache_new.direct_access;
            document.querySelector('[Liminal-WM="allow_script"]').checked = cache_new.allow_script;

            document.querySelector('[Liminal-WM="delete_rule"]').removeAttribute("style");
            document.querySelector('[Liminal-WM="delete_rule"]').setAttribute("onclick", `delete_rule()`);
        }

        document.querySelector('[Liminal-WM="error_page"]').innerHTML = `<tbody><tr><td>Code</td><td>Page</td><td>Modifiy</td></tr></tbody>`;
        for(let i in Object.keys(cache_new.error)){
            let error_page_list = document.querySelector('[Liminal-WM="error_page"] > tbody');

            let new_tr = document.createElement("tr");

            new_tr.innerHTML += `<td>${Object.keys(cache_new.error)[i]}</td>`;
            new_tr.innerHTML += `<td>${cache_new.error[Object.keys(cache_new.error)[i]]}</td>`;
            new_tr.innerHTML += `<td onclick="edit_alert('${Object.keys(cache_new.error)[i]}', 'rule', 'error_page')">edit</td>`;            
            
            error_page_list.appendChild(new_tr);
        }


        document.querySelector('[Liminal-WM="allow_type"]').innerHTML = `<tbody><tr><td>Extension</td><td>Content-type</td><td>Modifiy</td></tr></tbody>`;
        for(let i in Object.keys(cache_new.allow_extension)){
            let allow_extension_list = document.querySelector('[Liminal-WM="allow_type"] > tbody');

            let new_tr = document.createElement("tr");

            new_tr.innerHTML += `<td>${Object.keys(cache_new.allow_extension)[i]}</td>`;
            new_tr.innerHTML += `<td>${cache_new.allow_extension[Object.keys(cache_new.allow_extension)[i]].type}</td>`;
            new_tr.innerHTML += `<td onclick="edit_alert('${Object.keys(cache_new.allow_extension)[i]}', 'rule', 'allow_type')">edit</td>`;            
            
            allow_extension_list.appendChild(new_tr);
        }
    }

    const modify_block = document.querySelector("div.modify_block[visible='true']");
    modify_block.setAttribute("visible", "false");
}

async function edit_alert(target_obj, type, node) {
    if(type == "rule"){
        if(node == "error_page"){
            let new_code = prompt("Please Enter New Error Code.\nif want delete, please enter //delete.", target_obj);

            if(new_code == null)
                return;

            if(new_code == "//delete" && target_obj != ""){
                delete cache_new.error[target_obj];
            } else if(isNaN(parseInt(new_code)) && target_obj == "") {
                alert("error enter.");
                return;
            } else {
                let new_page = prompt("Please Enter New Error Page.", `${new_code}.html`);

                if(new_code != target_obj && target_obj != "")
                    delete cache_new.error[target_obj];

                cache_new.error[new_code] = new_page;
            }
        }

        if(node == "allow_type"){
            let new_Extension = prompt("Please Enter New Extension.\nif want delete, please enter //delete.", "");

            if(new_Extension == null)
                return;

            if(new_Extension == "//delete" && target_obj != ""){
                delete cache_new.allow_extension[target_obj];
            } else if(new_Extension == "//delete" && target_obj == "") {
                alert("error enter.");
                return;
            } else {
                let new_page = prompt("Please Enter return Content-type", `default`);

                if(new_page != target_obj && target_obj != "")
                    delete cache_new.allow_extension[target_obj];

                cache_new.allow_extension[new_Extension] = {
                    "type" : new_page
                };
            }
        }

        document.querySelector('[Liminal-WM="error_page"]').innerHTML = `<tbody><tr><td>Code</td><td>Page</td><td>Modifiy</td></tr></tbody>`;
        for(let i in Object.keys(cache_new.error)){
            let error_page_list = document.querySelector('[Liminal-WM="error_page"] > tbody');

            let new_tr = document.createElement("tr");

            new_tr.innerHTML += `<td>${Object.keys(cache_new.error)[i]}</td>`;
            new_tr.innerHTML += `<td>${cache_new.error[Object.keys(cache_new.error)[i]]}</td>`;
            new_tr.innerHTML += `<td onclick="edit_alert('${Object.keys(cache_new.error)[i]}', 'rule', 'error_page')">edit</td>`;            
            
            error_page_list.appendChild(new_tr);
        }


        document.querySelector('[Liminal-WM="allow_type"]').innerHTML = `<tbody><tr><td>Extension</td><td>Content-type</td><td>Modifiy</td></tr></tbody>`;
        for(let i in Object.keys(cache_new.allow_extension)){
            let allow_extension_list = document.querySelector('[Liminal-WM="allow_type"] > tbody');

            let new_tr = document.createElement("tr");

            new_tr.innerHTML += `<td>${Object.keys(cache_new.allow_extension)[i]}</td>`;
            new_tr.innerHTML += `<td>${cache_new.allow_extension[Object.keys(cache_new.allow_extension)[i]].type}</td>`;
            new_tr.innerHTML += `<td onclick="edit_alert('${Object.keys(cache_new.allow_extension)[i]}', 'rule', 'allow_type')">edit</td>`;            
            
            allow_extension_list.appendChild(new_tr);
        }
    }
}

async function close_modify(Skip) {
    if(!Skip){
        const comfirm_delete = confirm("Are you sure leave this editor?");

        if(!comfirm_delete){
            return;
        }
    }

    const modify_block = document.querySelector("div.modify_block[visible='false']");

    modify_block.setAttribute("visible", "true");

    document.querySelector('[Liminal-WM="title"]').innerHTML = `title`;

    document.querySelector('[Liminal-WM="id"]').innerHTML = "";
    document.querySelector('[Liminal-WM="disable"]').checked = false;
    document.querySelector('[Liminal-WM="name"]').value = "";
    document.querySelector('[Liminal-WM="url"]').value = "";
    document.querySelector('[Liminal-WM="target"]').value = "";
    document.querySelector('[Liminal-WM="direct_access"]').checked = false;
    document.querySelector('[Liminal-WM="allow_script"]').checked = false;

    document.querySelector('[Liminal-WM="error_page"]').innerHTML = `<tbody><tr><td>Code</td><td>Page</td><td>Modifiy</td></tr></tbody>`;
    document.querySelector('[Liminal-WM="allow_type"]').innerHTML = `<tbody><tr><td>Extension</td><td>Content-type</td><td>Modifiy</td></tr></tbody>`;

    document.querySelector('[Liminal-WM="delete_rule"]').removeAttribute("style");
}


async function delete_rule() {
    if(cache[cache_flag] == undefined){
        alert("you are trying to do cool someting...");
        return;
    }

    const comfirm_delete = confirm("Are you sure delete this?");

    if(comfirm_delete){
        delete cache[cache_flag];

        cache = cache.filter(item => item !== undefined);

        upload_file("delete");
    }

    return;
}

async function save_rule() {
    cache_new.Disable = document.querySelector('[Liminal-WM="disable"]').checked;
    cache_new.name = document.querySelector('[Liminal-WM="name"]').value;
    cache_new.url = document.querySelector('[Liminal-WM="url"]').value;
    cache_new.target = document.querySelector('[Liminal-WM="target"]').value;
    cache_new.direct_access = document.querySelector('[Liminal-WM="direct_access"]').checked;
    cache_new.allow_script = document.querySelector('[Liminal-WM="allow_script"]').checked;

    cache[cache_flag] = cache_new;

    cache = cache.filter(item => item !== undefined);

    upload_file("save");

    return;
}

async function upload_file(action) {
    let fetch_page;
    let send_delete = null;
    if(cache_page == "Rule")
        fetch_page = "./upload_rule";

    if(cache_page == "Rule" && action == "delete"){
        send_delete = cache_flag;
    }

    if(fetch_page == ""){
        alert("you are trying to do cool someting...");
        return;
    }

    let result = await fetch(fetch_page, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: JSON.stringify({
            delete_ID : send_delete,
            data : cache
        })
    });

    if(!result.ok){
        alert("Something is error...");
    }

    close_modify(true);
    page_req(cache_page);
}

function setCookies(name, value, expiresDay){
    const expiresUnix = new Date();
    expiresUnix.setTime(expiresUnix.getTime() + ((expiresDay * 24 * 60 * 60) * 1000));
    document.cookie = `${name}=${value};expires=${expiresUnix.toUTCString()};path=/`;

    return true;
}

function getCookies(name){
    const cookies_String = decodeURIComponent(document.cookie);
    const cookies_list = cookies_String.split(";").map(value=>{
        return value.trim();
    });

    for(let i in cookies_list){
        const select_cookies = cookies_list[i].split("=").map(value=>{
            return value.trim();
        });
        
        if(select_cookies[0] == name.trim())
            return select_cookies[1];
    }

    return false;
}

function deleteCookies(name){
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}