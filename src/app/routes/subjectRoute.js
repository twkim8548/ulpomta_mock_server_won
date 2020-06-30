module.exports = function(app){
    const sub = require('../controllers/subjectController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    app.route('/sub').post(sub);
    app.get('/findemail',jwtMiddleware, user.findemail);//토큰 필요없는데도 넣어야하는지?!

};