var _ = require('underscore');
var async = require('async');
var Promise = require('bluebird');

_.mixin({
	getObjPath: function(obj, path, defaultValue, separator) {
		defaultValue = defaultValue || undefined;
		separator = separator || '.';
		for(var parts = path.split(separator), rv = obj, index = 0; rv && index < parts.length; ++index) rv = rv[parts[index]];
		return rv || defaultValue;
	},
	setObjPath: function(obj, path, value, separator) {
		separator = separator || '.';
		var keys = path.split(separator);
		var result = obj;
		for (var i = 0, n = keys.length; i < n && !_.isUndefined(result); i++) {
			var field = keys[i];
			if (i === n - 1) {
				result[field] = value;
			} else {
				if (_.isUndefined(result[field]) || !_.isObject(result[field]))
					result[field] = {};
				result = result[field];
			}
		}
	}
});

/**
 * Demux constructor
 *
 * @main
 * @class Demux
 * @param [config={}] {Object} Demux config
 * @constructor
 */
var Demux = function(config) {
	config = config || {};
	this.separator = config.separator || '.';
	this.actions = config.actions || {};
	this.path = config.path || '/api';
	this.method = config.method || 'POST';
	this.debug = config.debug || false;
};

/**
 * @method version
 * @static
 * @type {string}
 */
Demux.version = '0.0.1';

/**
 * Adding action.
 *
 * @method addAction
 * @param {String} path Path to action handler function
 * @param {Function} handler function(request, response) {}
 * @param {String} [separator='.']{String}
 *
 * @example
 *  addAction('Namespace.Another.Here.We.Are', function(request, response) {
 *      response('It\'s all right. Thanks for using this method');
 *  });
 */
Demux.prototype.addAction = function(path, handler, separator) {
	_.setObjPath(this.actions, path, handler, this.separator);
};

/**
 * Express Middleware connector
 *
 * @returns {function(this:Demux)}
 */
Demux.prototype.connector = function() {
	return this.middleware.bind(this);
};

/**
 * Express Middleware
 *
 * @method middleware
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
Demux.prototype.middleware = function(req, res, next) {
	if(req.path !== this.path)
		return next();

	// CORS answer for OPTIONS request
	if(req.method === 'OPTIONS')
	{
		res
			.header({
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': this.method,
				'Access-Control-Allow-Headers': 'Content-Type',
				'Access-Control-Allow-Credentials': true
			})
			.status(200)
			.end();
	}

	if(req.method !== this.method)
		return next();

	var requests = this.getRequests(req);
	this.handleRequests(requests, res);
};

/**
 * @protected
 * @method getRequests
 *
 * @param {Object} req
 */
Demux.prototype.getRequests = function(req) {
	if(this.method === 'GET')
		return req.query;
	else if(this.method === 'POST')
		return req.body;
	else
		throw 'Unknown HTTP Method setted in Demux.method';
};

Demux.prototype.handleRequests = function(requests, res) {
	var self = this;
	if(!_.isArray(requests))
		throw 'Bad request: JSON was expected.';

	async.map(requests, function(request, callback) {
		Promise
			.resolve(request)
			.then(self.checkRequest)
			.then(self.executeRequest.bind(self))
			.then(function(result) { callback(null, {success: true, data: result}); }, function(err) { callback(null, {success: false, message: err}); });
	}, function(err, results) {
		//console.log('Results:');
		//console.log(results);

		// CORS
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Credentials', true);

		res.send(results);
	});
};

Demux.prototype.checkRequest = function(request) {
	if(!_.isObject(request) || !_.has(request, 'action') || !_.has(request, 'args'))
		throw 'Bad Request';

	return request;
}

Demux.prototype.executeRequest = function(request) {
	var action = request.action;
	var actionHandler = _.getObjPath(this.actions, action, undefined, this.separator);
	if(!actionHandler)
		throw 'Action "' + action + '" cannot be found';

	request = _.omit(request, ['action']);

	return actionHandler(request);
};

module.exports = Demux;