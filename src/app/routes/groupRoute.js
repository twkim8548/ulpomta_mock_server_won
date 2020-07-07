module.exports = function(app){
    const group = require('../controllers/groupController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    // app.get('/group',jwtMiddleware, group.findemail);//24.가입한 그룹 조회
    // app.get('/group/update',jwtMiddleware, group.findemail);//25. 전체그룹조회
    // app.get('/findemail',jwtMiddleware, group.findemail);//전체그룹조회
    // app.get('/findemail',jwtMiddleware, group.findemail);//전체그룹조회
    app.route('/group').post(jwtMiddleware, group.createGroup);//28.그룹생성
    // app.get('/:gid',jwtMiddleware, group.findemail);//그룹 둘러보기
    app.route('/:gid/join').post(jwtMiddleware, group.createUserGroup);//30.그룹 가입

    // app.get('/:gid/member',jwtMiddleware, group.findemail);//그룹 내 지금 공부중인 멤버 조회
    // app.get('/:gid/invite',jwtMiddleware, group.findemail);//친구초대
    // app.get('/:gid/info',jwtMiddleware, group.findemail);//33.그룹정보
    app.route('/:gid/join').delete(jwtMiddleware, group.deleteUserGroup);//34.그룹탈퇴
    //app.route('/:gid/info').patch(jwtMiddleware, group.updateUserInfo);//35.그룹 정보 수정
    app.route('/group/:gid').delete(jwtMiddleware, group.deleteGroup);//36.그룹 삭제

};