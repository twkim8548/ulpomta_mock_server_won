module.exports = function(app){
    const time = require('../controllers/timecheckController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    //main page
    app.get('/home',jwtMiddleware, time.getSubTimeCheck);//14. 홈화면


    app.route('/timecheck/start').post(jwtMiddleware,time.startTimeCheck);//17. 시간 측정 시작
    app.route('/timecheck/start2').post(jwtMiddleware,time.startTimeCheck2);//휴식시간 업데이트
    app.route('/timecheck/finish').post(jwtMiddleware,time.finishTimeCheck);//18. 시간 측정 종료
    app.get('/timecheck',jwtMiddleware, time.getTimeCheck);//19. 시간 측정 페이지

   // app.get('/timecheck/sect',jwtMiddleware, time.getSectCheck);//20. 달력페이지 공부시간 단위로 받아오기
    app.get('/stats/daily',jwtMiddleware, time.getDailyStatus);//21. 일간 통계
    app.get('/timestat/daily',jwtMiddleware, time.getDailyTime);//21.일간 lite
    app.get('/timestat/weekly',jwtMiddleware, time.getWeeklyTime);//21.주간 lite
    app.get('/timestat/monthly',jwtMiddleware, time.getMonthlyTime);//21.월간 lite
    
};