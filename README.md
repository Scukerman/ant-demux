ant-demux
=========

A demultiplexor API + Express Middleware connector

Demo:
```javascript
var Demux = require('ant-demux');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());
app.use(function (error, req, res, next) {
	if(error.message === 'invalid json')
		return res.send('Bad request: JSON was expected.');
	next();
});

var frontendApi = new Demux({
	actions: {
		'namespace': {
			'method1': function() {
				return 'method1: test';
			}
		}
	}
});
frontendApi.addAction('namespace.method2', function(request) {
	return "Method2: that's ok too";
});

app.use(frontendApi.connector());

app.listen(3000, function() {
	console.log('Started at 3000');
});
```
