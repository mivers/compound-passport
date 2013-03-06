// all providers https://api.singly.com/services

var passport = require('passport');

exports.callback = function(accessToken, refreshToken, profile, done) {
	var filter = {
		where: {
			singlyId: profile.id
		}
	};
	var user = {
		displayName: profile.displayName || profile.username,
		email: profile.emails[0].value,
		emailVerified: true,
		singlyId: profile.id,
		singlyProfile: profile._json,
		singlyAccessToken: accessToken,
		singlyRefreshToken: refreshToken
	};
	exports.User.findOrCreate(filter, user, function(err, user) {
		return done(err, user);
	});
};

exports.init = function(conf, app) {
	console.log(app.baseURL);
	var Strategy = require('passport-singly').Strategy;
	passport.use(new Strategy({
		clientID: conf.singly.clientID,
		clientSecret: conf.singly.clientSecret,
		callbackURL: app.baseURL + '/auth/singly/callback'
	}, exports.callback));

	app.get('/auth/singly/:service', passport.authenticate('singly'));

	app.get('/auth/singly/callback', passport.authenticate('singly', {
		failureRedirect: conf.failureRedirect || '/'
	}), exports.redirectOnSuccess);

};