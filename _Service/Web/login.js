window.addEventListener('load', async ()=>{
    const website_status = await (await fetch("./Check_init",{
        method: 'POST'
    })).text();

    let page_doc;

    if(website_status == "no account")
        page_doc = await (await fetch("./login_page/register.html")).text();
    else if(website_status == "already")
        page_doc = await (await fetch("./login_page/login.html")).text();
    else
        page_doc = "service error."

    document.querySelector('[Liminal-WM-item="login-element"]').innerHTML = page_doc;

    //檢查Cookies
    if(getCookies("auth")){
        const cookies_status = await (await fetch("./cookies_login",{
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: btoa(getCookies("auth"))
        }))

        //取出資料
        let cookies_data = await cookies_status.text();

        if (cookies_status.ok && JSON.parse(cookies_data).respone == true){
            document.querySelector('[Liminal-WM-item="login-element"]').innerHTML = "Now Login...";
            window.location = "index.html";
        } else if(cookies_status.ok && JSON.parse(cookies_data).respone == false){
            chackbox_Alert("Cookies Error.");
            deleteCookies("auth");
        } else if (cookies_status.status == 429){
            chackbox_Alert("You try it fast. Calm down.");
            deleteCookies("auth");
        } else if (cookies_status.status == 403){
            chackbox_Alert("You try to modifiy someting...");
            deleteCookies("auth");
        } else if (cookies_status.status == 500){
            chackbox_Alert("Server get some error.");
            deleteCookies("auth");
        }
    }

    document.querySelector('[Liminal-WM-item="login-element"]').removeAttribute("class");
});

async function comfirm(){
    //取得三個參數
    const Account = document.getElementById("Account").value;
    const Password = document.getElementById("Password").value;
    const Comfirm_Password = document.getElementById("C_Password")?.value;

    //建立傳送類別
    let type;

    //如果確認是undefiend，那就是登入頁面
    if(Comfirm_Password == undefined){
        type = "login";
    }else{  //反之亦然
        type = "register";
    }

    //判斷帳號長短
    if(Account.length < 4 && type == "register"){
        chackbox_Alert("Account must longer than 4 characters.");
        return;
    }

    //判斷密碼長短
    if(Password.length < 8 && type == "register"){
        chackbox_Alert("Password must longer than 8 characters.");
        return;
    }

    //判斷確認密碼正確性
    if(Password != Comfirm_Password && type == "register"){
        chackbox_Alert("Password not same.");
        return;
    }

    //判斷是不是空的
    if((Password == "" || Account == "") && type == "login"){
        chackbox_Alert("Incorrect account or password.");
        return;
    }

    //建立資訊陣列
    let POST_Account_data;

    //判斷類型
    if(type == "login"){
        POST_Account_data = {
            "account":Account,
            "password":Password
        }
    }else if(type == "register"){
        POST_Account_data = {
            "account":Account,
            "password":Password,
            "comfirm_password":Comfirm_Password
        }
    }

    //POST到後端
    const POST = await fetch(`./${type}`,{
        method: 'POST',
        headers: {
            'Content-Type': 'text/json'
        },
        body: btoa(JSON.stringify(POST_Account_data))
    }).catch();

    //取出資料
    let POST_data = await POST.text();

    if (POST.ok && JSON.parse(POST_data).respone == true){
        document.querySelector('[Liminal-WM-item="login-element"]').innerHTML = "Now Login...";
        setCookies("auth", JSON.parse(POST_data).UUID, 365);
        window.location = "index.html";
    } else if(POST.ok && JSON.parse(POST_data).respone == false){
        chackbox_Alert(JSON.parse(POST_data).reason);
    } else if (POST.status == 429){
        chackbox_Alert("You try it fast. Calm down.");
    } else if (POST.status == 403){
        chackbox_Alert("You try to modifiy someting...");
    } else if (POST.status == 500){
        chackbox_Alert("Server get some error...");
    }
}

function chackbox_Alert(message){
    document.querySelector(".chackbox").innerHTML = message;
    document.querySelector(".chackbox").setAttribute("Alert", "error");
    document.querySelector(".chackbox").removeAttribute("onclick");

    setTimeout(()=>{
        document.querySelector(".chackbox").innerHTML = "Login";
        document.querySelector(".chackbox").removeAttribute("Alert");
        document.querySelector(".chackbox").setAttribute("onclick", "comfirm()");   
    },3000);
}

/**
 * 
 * @param {string} name 
 * @param {string} value 
 * @param {number} expiresDay 
 */
function setCookies(name, value, expiresDay){
    const expiresUnix = new Date();
    expiresUnix.setTime(expiresUnix.getTime() + ((expiresDay * 24 * 60 * 60) * 1000));
    document.cookie = `${name}=${value};expires=${expiresUnix.toUTCString()};path=/`;

    return true;
}

/**
 * 
 * @param {string} name 
 */
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