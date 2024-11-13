<div align="center">
<img src="/_Service/Logo.png" width="200px">
<h1>Liminal-WM</h1>
<p>Liminal Web Manager</p>
<sub>Web Manager based on Node.js</sub>
<p></p>
</div>

<div align="center">

![Language](https://badgen.net/badge/Language/Javascript/orange)
![Version](https://badgen.net/badge/NodeVersion/v20.17.0/green)

</div>

# Not Yet Public
This project is still in progress. Please wait...

# Liminal-WM Beta v4

A web manager built on the Node.js framework.

I spent 24 hours of my life on this project to simplify future JavaScript-based web deployments.

Initially, I intended to use Express.js but discovered that native `http` works just as well.

To avoid numerous issues, I reverted to using the native module.

~~(I only realized halfway through that native `http` would work, almost exploded)~~

Overall, this is designed to be simple and easy to use.

To address server-side functionality, it also supports running Node.js (on the server), which compensates for the lack of PHP support.

~~(Who knows how much time I spent dealing with this)~~

# Requirements
- [Node.js v20](https://nodejs.org/en)

# Testing Environment
- Linux (Ubuntu LTS22.04)

# Server Framework
Unlike typical server-side PHP, this uses Node.js and is restricted to CommonJS (please bear with this limitation for the first version).

~~(It also allows server-side Discord Bot functionality, WTF)~~

# JavaScript Files
Each `.js` file intended for server operation should follow this structure:

It should include an `Liminal_main` function, which accepts `req` and `param` as arguments.

- `req` is the web request class, just like a standard `req`.
- `param` contains parameters, which will be passed as an object if not using POST.

Example for `./test/test.js`:
```js
async function Liminal_main(req, param){
	return "Hello World";
}

module.exports = {
	Liminal_main : Liminal_main
}
```
Accessing `localhost:51000/test/test.js` should display "Hello World" as output.

Next~

# Basic Operation

To start the web server, create a folder in `./` and add files inside it.

The system's main process is `./main.mjs`; unless you're a developer, avoid modifying it.

The core system directory is `./_Service`; unless you're a developer, avoid modifying its contents.

Check `./_Service/Data/url.json`.
The sample format should be self-explanatory:
| Field | Purpose |
|---|---|
| name | Service name for webpage identification |
| url | Browser URL |
| target | Target directory |
| direct_access | Allow direct URL access? |
| allow_extension | Allowed file types (default is system preset) |
| error | Custom error page |

For example, to map "Hello" to the root directory, allowing direct access and only `jpg` files, add the following:
```json
{
	"name" : "Hello JPG",
	"url" : "Hello",
	"target" : "",
	"direct_access" : true,
	"allow_extension" : {
	    "jpg":{
		"type":"default"
	    }
	},
	"error":{
		
	},
	"ID":0
}
```

> Note: If you enable root directory mapping to the root, all subsequent folder mapping logic will be overridden.

# How to Run
```
node ./main.mjs
```

Keep going, kid.

I'll be back with updates in the future.

Feel free to open issues.

# Thanks
Special thanks to the developers of Node.js, and my brain.
