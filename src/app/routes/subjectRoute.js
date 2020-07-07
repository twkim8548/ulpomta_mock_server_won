module.exports = function(app){
    const sub = require('../controllers/subjectController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    app.get('/sub',jwtMiddleware, sub.getSubject);//과목 조회
    app.route('/sub').post(jwtMiddleware,sub.createSubject);//05.과목생성
    app.route('/sub').patch(jwtMiddleware,sub.updateSubject);//06. 과목수정
    app.route('/sub').delete(jwtMiddleware,sub.deleteSubject);//07. 과목 삭제
   
};