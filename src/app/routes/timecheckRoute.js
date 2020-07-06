module.exports = function(app){
    const time = require('../controllers/timecheckController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    //main page
    //app.get('/:date/sub',jwtMiddleware, time.getSubTimeCheck);//14. 과목별 공부시간, todo조회
    app.get('/today/timecheck',jwtMiddleware, time.getDailyTimeCheck);//15. 오늘의 총 공부시간
    app.get('/today/rest',jwtMiddleware, time.getRestTimeCheck);//16. 오늘의 마지막 공부 이후 휴식시간

    app.route('/timecheck/start').post(jwtMiddleware,time.startTimeCheck);//17. 시간 측정 시작
    app.route('/timecheck/start2').post(jwtMiddleware,time.startTimeCheck2);//휴식시간 업데이트
    app.route('/timecheck/finish').post(jwtMiddleware,time.finishTimeCheck);//18. 시간 측정 종료
    app.get('/timecheck/:sid',jwtMiddleware, time.getTimeCheck);//19. 시간 측정 페이지


   
};