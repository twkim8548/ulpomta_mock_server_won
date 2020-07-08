module.exports = function(app){
    const cafe = require('../controllers/cafeController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    app.get('/cafe/cate', jwtMiddleware, cafe.cateBoardList);//카테고리 글 모아보기ㅇㄹ
    app.get('/cafe/list', jwtMiddleware, cafe.boardList);//전체글 모아보기ㅇㄹ
    app.get('/cafe/board', jwtMiddleware, cafe.boardInfo);//상세글보기ㅇㄹ
    app.route('/cafe/board').post(jwtMiddleware,cafe.createBoard);//글작성ㅇㄹ
    app.route('/cafe/board').delete(jwtMiddleware, cafe.deleteBoard);//글 삭제ㅇㄹ

    app.route('/cafe/likeboard').post(jwtMiddleware,cafe.likeBoard);//글 좋아요ㅇㄹ
    app.route('/cafe/markboard').post(jwtMiddleware,cafe.markBoard);//글 북마크ㅇㄹ

    app.route('/cafe/comment').post(jwtMiddleware,cafe.createComment);//댓글 작성ㅇㄹ
    app.route('/cafe/comment').delete(jwtMiddleware,cafe.deleteComment);//댓글 삭제ㅇㄹ

    app.route('/cafe/likecomment').post(jwtMiddleware,cafe.likeComment);//댓글 좋아요ㅇㄹ
    app.route('/cafe/recomment').post(jwtMiddleware,cafe.createRecomment);//답글 달기ㅇㄹ

    app.get('/cafe/search', jwtMiddleware, cafe.search);//제목 검색ㅇㄹ
    app.get('/cafe/user', jwtMiddleware, cafe.userBoard);//작성한 게시물 보기ㅇㄹ
    app.get('/cafe/usermark', jwtMiddleware, cafe.userMark);//북마크 목록 보기ㅇㄹ
};
