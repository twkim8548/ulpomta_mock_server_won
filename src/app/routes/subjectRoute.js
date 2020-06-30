module.exports = function(app){
    const sub = require('../controllers/subjectController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    app.route('/sub').post(jwtMiddleware,sub.createSubject);//05.과목생성
    app.route('/sub/:sid').put(jwtMiddleware,sub.updateSubject);//06. 과목수정
    app.route('/sub/:sid').delete(jwtMiddleware,sub.deleteSubject);//07. 과목 삭제
   
};