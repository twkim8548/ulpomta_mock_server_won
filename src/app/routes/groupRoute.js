module.exports = function(app){
    const group = require('../controllers/groupController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    // app.get('/findemail',jwtMiddleware, group.findemail);//24.가입한 그룹 조회
    // app.get('/findemail',jwtMiddleware, group.findemail);//25. 전체그룹조회
    // app.get('/findemail',jwtMiddleware, group.findemail);//전체그룹조회
    // app.get('/findemail',jwtMiddleware, group.findemail);//전체그룹조회
    app.route('/group').post(jwtMiddleware, group.createGroup);//그룹생성
    // app.get('/findemail',jwtMiddleware, group.findemail);//그룹 둘러보기
    // app.route('/user').post(jwtMiddleware, group.updateUserInfo);//그룹 가입

    // app.get('/findemail',jwtMiddleware, group.findemail);//그룹 내 지금 공부중인 멤버 조회
    // app.get('/findemail',jwtMiddleware, group.findemail);//친구초대
    // app.get('/findemail',jwtMiddleware, group.findemail);//그룹정보
    // app.route('/user').post(jwtMiddleware, group.updateUserInfo);//그룹탈퇴
    //app.route('/group').post(jwtMiddleware, group.updateUserInfo);//그룹 정보 수정
    app.route('/group/:gid').delete(jwtMiddleware, group.deleteGroup);//그룹 삭제

};