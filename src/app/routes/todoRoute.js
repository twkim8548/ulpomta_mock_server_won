module.exports = function(app){
    const todo = require('../controllers/todoController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    
    app.route('/todo').post(jwtMiddleware,todo.createTodo);   //08. todo 생성
    app.route('/todo/:tid/check').post(jwtMiddleware,todo.createTodoStatus);//09. todo 진행상황 체크
    app.get('/todo/:tid/check',jwtMiddleware, todo.getTodoStatus);//10. todo 진행상황 조회
    app.route('/todo/:tid').patch(jwtMiddleware,todo.updateTodo);//11. todo 수정
    app.get('/todo/:date',jwtMiddleware, todo.getDailyTodo);//12. todo 날짜별 조회
    app.get('/todo/:mon',jwtMiddleware, todo.getTodo);//13. todo 날짜별 조회(한달)

   
};