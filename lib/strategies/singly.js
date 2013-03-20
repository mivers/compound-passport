// all providers https://api.singly.com/services

var passport = require('passport');

exports.callback = function(accessToken, refreshToken, profile, done) {
	var filter = {
		where: {
			singlyId: profile.id
		}
	};

	var singlyUpdatesUser = {
		singlyProfile: profile._json,
		singlyAccessToken: accessToken,
		singlyRefreshToken: refreshToken
	};

	var newUser = {
		singlyId: profile.id,
		username: profile.username,
		displayName: profile.displayName || profile.username,
		email: profile.emails[0].value,
		emailVerified: true,
		picture: profile.thumbnail_url
	};
	newUser.protoype = singlyUpdatesUser;

	exports.User.findOrCreate(filter, newUser, function(err, user) {
		if (!err && user) {
			user.isValid(function(valid) {
				if (!valid) {
					console.log(user.errors);
				}
			});

			user.updateAttributes(singlyUpdatesUser, function(err) {
				done(err, user);
			});

		} else {
			done(err, user);
		}
	});
};

exports.init = function(conf, app) {
	var Strategy = require('passport-singly').Strategy;
	passport.use(new Strategy({
		clientID: conf.singly.clientID,
		clientSecret: conf.singly.clientSecret,
		callbackURL: app.baseURL + '/auth/singly/callback'
	}, exports.callback));

	app.get('/auth/singly/:service', passport.authenticate('singly'));

	app.get('/auth/singly/callback', passport.authenticate('singly', {
		failureRedirect: conf.failureRedirect || '/'
	}), exports.onSuccess);

};