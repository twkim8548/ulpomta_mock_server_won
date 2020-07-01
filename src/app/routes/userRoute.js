module.exports = function(app){
    const user = require('../controllers/userController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    app.route('/signup').post(user.signUp);//01. 회원가입
    app.route('/signin').post(user.signIn);//02. 로그인
    app.get('/findemail',user.findEmail);//03. 이메일 찾기//토큰 필요없는데도 넣어야하는지?!
    app.get('/findpswd', user.findPswd);//04. 비밀번호 찾기

    app.get('/user',jwtMiddleware, user.getUserInfo);//회원정보 조회
    app.route('/user').put(jwtMiddleware, user.updateUserInfo);//회원정보 수정
    app.route('/user').delete(jwtMiddleware, user.deleteUser);//회원 탈퇴

    app.get('/check', jwtMiddleware, user.check);
};