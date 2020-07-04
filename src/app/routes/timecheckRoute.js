module.exports = function(app){
    const todo = require('../controllers/todoController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    //main page
    app.get('/:date/sub',jwtMiddleware, todo.getSubTimeCheck);//14. 과목별 공부시간, todo조회
    app.get('/:date/timecheck',jwtMiddleware, todo.getDailyTimeCheck);//15. 날짜별 총 공부시간
    app.get('/:date/rest',jwtMiddleware, todo.getRestTimeCheck);//16. 마지막 공부 이후 휴식시간

    //app.route('/timecheck/start').post(jwtMiddleware,todo.startTimeCheck);//17. 시간 측정 시작
    //app.route('/timecheck/finish').post(jwtMiddleware,todo.finishTimeCheck);//18. 시간 측정 종료
    //app.get('/timecheck',jwtMiddleware, todo.getTimeCheck);//19. 시간 측정 페이지


   
};