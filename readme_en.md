# End of Support
This project is end of support, you can go to [Liminal-NSP](https://github.com/caloutw/Liminal-NSP) and get the newest update.


<div align="center">
<img src="./_Service/Web/Logo.png" width="200px">
<h1>Liminal-WM</h1>
<p>Liminal Web Manager</p>
<sub>A Node.js-based web manager</sub>
<p></p>
</div>

<div align="center">

English | [繁體中文](readme.md)

![Language](https://badgen.net/badge/Language/Javascript/orange)
![Version](https://badgen.net/badge/Node%20Version/v20.17.0/green)

</div>

# Not Completed Yet
This is an unfinished project. Please wait...

# Liminal-WM Beta v9

A web manager built with the Node.js framework.

I wasted 24 hours of my life just to make it easier to host JS-based websites in the future.

Initially, I thought of using Express.js, but later found that the native `http` module could also work.

To avoid a bunch of issues, I switched back to the native module.

~~(I only realized halfway through that the native module could work. I was about to explode.)~~

Anyway, this tool is convenient and easy to use.

To make it run on the server side, I also added support for running Node.js (server-side).

Finally, this fills the gap of not being able to use PHP.

~~(Who knows how much time I wasted dealing with this...)~~

# Requirements
- [Node.js v20](https://nodejs.org/en)

# Testing Environment
- Linux (Ubuntu LTS 22.04)

# Server Framework
Unlike PHP, which is commonly used for server requests, this uses Node.js and is limited to CommonJS (please bear with me for the first version).

~~(You can even use this to run a Discord Bot on the server side, WTF.)~~

# JavaScript Files
Each `.js` file intended for server execution should follow this specification:

A `Liminal_main` function that takes two parameters: `req` and `param`.

`req` is the web request object, similar to a standard `req`.

`param` represents the parameters. If POST is not used, the parameters will be passed as an object.

`./T/Test.js`:
```js
async function Liminal_main(req, param) {
	return "Hello World";
}

module.exports = {
	Liminal_main: Liminal_main
}
```

Then, navigate to `localhost:51000/Test/Test.js`  
You should see the output "Hello World."

(Refer to the file `T/Test.js` in the folder.)

Next~

# Basic Operation

To serve web pages, create a folder under `/` and place your files in it.

Modify the web port in `./_Service/Data/config.json` under the `running_port` field.

> Note: If you allow root directory redirection, the folder redirection logic for all subsequent directories will be overridden.

# How to Run
``node ./main.mjs``

Then you can access the website at `localhost:51000/_Service/`.

Good luck, kid.

I’ll come back to update this in the future.

Feel free to open issues.

# Thanks
Special thanks to the developers of Node.js.

And my brain.

