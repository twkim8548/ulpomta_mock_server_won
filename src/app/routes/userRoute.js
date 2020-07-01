module.exports = function(app){
    const user = require('../controllers/userController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    app.route('/signup').post(user.signUp);//01. 회원가입
    app.route('/signin').post(user.signIn);//02. 로그인
    //app.get('/findemail',jwtMiddleware, user.findemail);//03.//토큰 필요없는데도 넣어야하는지?!
    //app.get('/findpswd',jwtMiddleware, user.findpswd);//04. 

    //app.get('/user',jwtMiddleware, user.getUserInfo);//회원정보 조회
    //app.route('/user').put(jwtMiddleware, user.updateUserInfo);//회원정보 수정
    //app.route('/user').delete(jwtMiddleware, user.deleteUser);//회원 탈퇴

    app.get('/check', jwtMiddleware, user.check);
};