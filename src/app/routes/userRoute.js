module.exports = function(app){
    const user = require('../controllers/userController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    app.route('/signup').post(user.signUp);
    app.route('/signin').post(user.signIn);
    app.get('/findemail',jwtMiddleware, user.findemail);//토큰 필요없는데도 넣어야하는지?!
    app.get('/findpswd',jwtMiddleware, user.findpswd);

    app.get('/check', jwtMiddleware, user.check);
};