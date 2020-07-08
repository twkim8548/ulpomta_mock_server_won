module.exports = function(app){
    const user = require('../controllers/userController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    app.route('/signup').post(user.signUp);//01. 회원가입
    app.route('/signin').post(user.signIn);//02. 로그인
    app.get('/findemail',user.findEmail);//03. 이메일 찾기//토큰 필요없는데도 넣어야하는지?!
    app.get('/findpswd', user.updatePswd);//04. 비밀번호 재설정

    app.get('/user',jwtMiddleware, user.getUserInfo);//37.회원정보 조회
    app.route('/user').put(jwtMiddleware, user.updateUserInfo);//38.회원정보 수정
    app.route('/user').delete(jwtMiddleware, user.deleteUser);//39.회원 탈퇴

    app.get('/check', jwtMiddleware, user.check);

    app.get('/notice',jwtMiddleware, user.noticeList);
    app.get('/notice/info',jwtMiddleware, user.noticeInfo);
};