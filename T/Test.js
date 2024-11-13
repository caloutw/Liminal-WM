async function MSP_main(req, param){
    let result = 1+1;

	return `The 1+1 answer is ${result}.\nNow Time is ${getCurrentDateTimeUTC8()}`;
}

const getCurrentDateTimeUTC8 = () => {
    const now = new Date();
    const options = {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    };

    // 格式化為 yyyy-mm-dd hh:mm:ss 格式
    const formattedDate = new Intl.DateTimeFormat("zh-TW", options).format(now);
    return formattedDate.replace(/\//g, '-').replace(',', '');
};
  
module.exports = {
	MSP_main : MSP_main
}