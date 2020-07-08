module.exports = function(app){
    const cafe = require('../controllers/cafeController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    app.get('/cafe/cate', jwtMiddleware, cafe.cateBoardList);//카테고리 글 모아보기
    app.get('/cafe/list', jwtMiddleware, cafe.boardList);//전체글 모아보기
    app.get('/cafe/board', jwtMiddleware, cafe.boardInfo);//상세글보기
    app.route('/cafe/board').post(jwtMiddleware,cafe.createBoard);//글작성
    app.route('/cafe/board').delete(jwtMiddleware, cafe.deleteBoard);//글 삭제
//글 좋아요
//글 북마크

    app.route('/cafe/comment').post(jwtMiddleware,cafe.createComment);//댓글 작성
    app.route('/cafe/comment').delete(jwtMiddleware,cafe.deleteComment);//댓글 삭제
//댓글 좋아요
//답글 달기

   // app.get('/cafe/search', jwtMiddleware, cafe.search);//제목 검색
    app.get('/cafe/user', jwtMiddleware, cafe.userBoard);//작성한 게시물 보기
//북마크 목록 보기
};
