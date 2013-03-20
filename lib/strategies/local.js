/* jslint node: true */
"use strict";

var passport = require('passport');

function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

exports.callback = function(email, password, done) {
    if (!validateEmail(email)) {
        done('invalid email', false);

    } else {
        exports.User.findOrCreate({
            where: {
                email: email
            }
        }, {
            email: email,
            password: password,
            displayName: email
        }, function(err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(err, false);
            }
            if (!exports.User.verifyPassword(password, user.password)) {
                return done(err, false);
            }
            return done(err, user);
        });
    }
};

exports.init = function(conf, app) {
    var Strategy = require('passport-local').Strategy;
    passport.use(new Strategy({
        usernameField: conf.usernameField || 'email'
    }, exports.callback));

    app.post('/login', passport.authenticate('local', {
        failureRedirect: '/login',
        failureFlash: true
    }), exports.onSuccess);

    //exports.setCallbackRoute('local', '/login');

    // TODO: rerender login with errors: https://github.com/jaredhanson/passport-local/issues/4
    /*
    app.post('/login', passport.authenticate('local', function(err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            // *** Display message without using flash option
            // re-render the login form with a message
            return res.render('login', {
                user: {email: user.email, errors: 'wrong login'}
            });
        }
        req.logIn(user, function(err) {
            if (err) {
                return next(err);
            }
            return res.redirect('/me');
        });
    })(req, res, next));*/
};