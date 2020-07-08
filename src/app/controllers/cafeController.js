
const {pool} = require('../../../config/database');
const {logger} = require('../../../config/winston');

const jwt = require('jsonwebtoken');

// 25. 카테고리 글 모아보기 ------------------------------------------------------------//

exports.cateBoardList = async function (req, res) {
    const id= req.verifiedToken.id;
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const getCateBoardList = `

            SELECT b.title, b.createdAt, (select exists (select img from board)from board)as existimg,
                (SELECT COUNT(idx) FROM comment as c WHERE c.boardId = b.idx and c.status='ACTIVE') AS commentCount,
                    (CASE
                    WHEN TIMESTAMPDIFF(MINUTE, b.createdAt, CURRENT_TIMESTAMP) < 60
                    then CONCAT(TIMESTAMPDIFF(MINUTE, b.createdAt, CURRENT_TIMESTAMP), ' 분전')
                    WHEN TIMESTAMPDIFF(HOUR, b.createdAt, CURRENT_TIMESTAMP) < 24
                    then CONCAT(TIMESTAMPDIFF(HOUR, b.createdAt, CURRENT_TIMESTAMP), ' 시간 전')
                    else CONCAT(TIMESTAMPDIFF(DAY, b.createdAt, CURRENT_TIMESTAMP), ' 일 전')
                    END) AS createAt
            FROM board AS b LEFT JOIN userInfo AS u
                ON u.idx = b.userId AND b.status != 'DELETED'
            WHERE b.category=u.category and u.idx=?
            ORDER BY b.createdAt DESC;
               
                `    ;

            const getCateBoardListParams = [id];

            const[cateBoardList]= await connection.query(getCateBoardList, getCateBoardListParams);

            await connection.commit(); // COMMIT
            connection.release();

            
            res.json({
                list:cateBoardList[0],
                isSuccess: true,
                code: 200,
                message: "카테고리별 게시글 목록 조회 성공"
            });
            
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get Cate Board List Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get Cate Board List DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

// 26. 전체글 모아보기 ------------------------------------------------------------//

exports.boardList = async function (req, res) {
    const id= req.verifiedToken.id;
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const getBoardList = `

            SELECT b.title, b.createdAt, if(img is not null, 1, 0)as existimg,
                (SELECT COUNT(idx) FROM comment as c WHERE c.boardId = b.idx and c.status='ACTIVE') AS commentCount,
                    (CASE
                    WHEN TIMESTAMPDIFF(MINUTE, b.createdAt, CURRENT_TIMESTAMP) < 60
                    then CONCAT(TIMESTAMPDIFF(MINUTE, b.createdAt, CURRENT_TIMESTAMP), ' 분전')
                    WHEN TIMESTAMPDIFF(HOUR, b.createdAt, CURRENT_TIMESTAMP) < 24
                    then CONCAT(TIMESTAMPDIFF(HOUR, b.createdAt, CURRENT_TIMESTAMP), ' 시간 전')
                    else CONCAT(TIMESTAMPDIFF(DAY, b.createdAt, CURRENT_TIMESTAMP), ' 일 전')
                    END) AS createAt
            FROM board AS b LEFT JOIN userInfo AS u
                ON u.idx = b.userId AND b.status != 'DELETED'
            ORDER BY b.createdAt DESC;
               
                `    ;

            const getBoardListParams = [id];

            const[boardList]= await connection.query(getBoardList, getBoardListParams);

            await connection.commit(); // COMMIT
            connection.release();

            
            res.json({
                list:boardList,
                isSuccess: true,
                code: 200,
                message: "게시글 목록 조회 성공"
            });
            
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get Cate Board List Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get Cate Board List DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

//    27. 상세글보기------------------------------------------------------------//

exports.boardInfo = async function (req, res) {
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const getBoardInfo = `
    
                SELECT b.title, b.content, b.userId AS boardUser, b.img, c.userId AS commentUser, c.content,
                    (CASE
                    WHEN TIMESTAMPDIFF(MINUTE, b.createdAt, CURRENT_TIMESTAMP) < 60
                    then CONCAT(TIMESTAMPDIFF(MINUTE, b.createdAt, CURRENT_TIMESTAMP), ' 분전')
                    WHEN TIMESTAMPDIFF(HOUR, b.createdAt, CURRENT_TIMESTAMP) < 24
                    then CONCAT(TIMESTAMPDIFF(HOUR, b.createdAt, CURRENT_TIMESTAMP), ' 시간 전')
                    else CONCAT(TIMESTAMPDIFF(DAY, b.createdAt, CURRENT_TIMESTAMP), ' 일 전')
                    END )AS boardCreatedAt,
                    (CASE
                    WHEN TIMESTAMPDIFF(MINUTE, c.createdAt, CURRENT_TIMESTAMP) < 60
                    then CONCAT(TIMESTAMPDIFF(MINUTE, c.createdAt, CURRENT_TIMESTAMP), ' 분전')
                    WHEN TIMESTAMPDIFF(HOUR, c.createdAt, CURRENT_TIMESTAMP) < 24
                    then CONCAT(TIMESTAMPDIFF(HOUR, c.createdAt, CURRENT_TIMESTAMP), ' 시간 전')
                    else CONCAT(TIMESTAMPDIFF(DAY, c.createdAt, CURRENT_TIMESTAMP), ' 일 전')
                    END )AS commentCreatedAt
                    FROM board AS b LEFT JOIN comment AS c
                         ON b.idx = c.boardId and c.status='ACTIVE'
                    WHERE b.idx=?;
                `    ;

            const getBoardParams = [req.query.boardId];

            const[boardInfo]= await connection.query(getBoardInfo, getBoardParams);

            await connection.commit(); // COMMIT
            connection.release();

            
            res.json({
                list:boardInfo[0],
                isSuccess: true,
                code: 200,
                message: "상세 게시글 조회 성공"
            });
            
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get Board Info Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get Board Info DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

//  28. 글작성  ------------------------------------------------------------//

exports.createBoard = async function (req, res) {
    const id= req.verifiedToken.id;
    const {
        title, content, img, tag, category
    } = req.body;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {            

            const insertBoardQuery = `
                INSERT INTO board (title, content, userId, img, tag, category)#tag는 말머리, null허용, 중복x, category해당 유저만 작성 가능
                VALUES(?, ?, ?, ?, ?, ?);
                    `;
            const insertBoardParams = [title, content, id, img, tag, category];
            await connection.query(insertBoardQuery, insertBoardParams);

            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                isSuccess: true,
                code: 200,
                message: "게시글 작성이 완료되었습니다"
            });
        } catch (err) {
            connection.release();
            logger.error(`App - Insert Board Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Insert Board Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

//     29. 글 삭제  ------------------------------------------------------------//
exports.deleteBoard = async function (req, res) {
    const id= req.verifiedToken.id;
    const bid= req.params.boardId;


    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const deleteBoardQuery = `
                UPDATE board 
                SET status='DELETED' 
                WHERE idx=? AND userId=?;
                    `;
            const deleteBoardParams = [bid, id];
            await connection.query(deleteBoardQuery, deleteBoardParams);

            await connection.commit(); // COMMIT
            connection.release();

            return res.json({
                isSuccess: true,
                code: 200,
                message: "게시글이 삭제되었습니다"
            });
        } catch (err) {
            connection.release();
            logger.error(`App - Delete Board Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Delete Board DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

// 30. 글 좋아요 ------------------------------------------------------------//


exports.likeBoard = async function (req, res) {
    const id= req.verifiedToken.id;
    const bid = req.body.boardId;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {            

            const likeBoardQuery = `
                insert likeInfo(userId, type, likeId) values
                (?, 1, ?);
                    `;
            const likeBoardParams = [id, bid ];
            await connection.query(likeBoardQuery, likeBoardParams);

            await connection.commit(); // COMMIT
            connection.release();

            return res.json({
                isSuccess: true,
                code: 200,
                message: "게시글 좋아요가 완료되었습니다"
            });
        } catch (err) {
            connection.release();
            logger.error(`App - like Board Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - like Board Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

// 31. 글 북마크 ------------------------------------------------------------//
exports.markBoard = async function (req, res) {
    const id= req.verifiedToken.id;
    const bid = req.body.boardId;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {            

            const markBoardQuery = `
                insert bookmark(userId, boardId) values
                (?, ?);
                    `;
            const markBoardParams = [id, bid];
            await connection.query(markBoardQuery, markBoardParams);

            await connection.commit(); // COMMIT
            connection.release();
            
            return res.json({
                isSuccess: true,
                code: 200,
                message: "게시글 북마크가 완료되었습니다"
            });
        } catch (err) {
            connection.release();
            logger.error(`App - mark Board Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - mark Board Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

//32. 댓글 작성 ------------------------------------------------------------//

exports.createComment = async function (req, res) {
    const id= req.verifiedToken.id;//회원id
    const content= req.body.content;
    const bid=req.query.boardId;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {            

            const insertCommentQuery = `
                INSERT INTO comment (content, userId, boardId) 
                VALUES(?, ?, ?);
                    `;
            const insertCommentParams = [content, id, bid];
            await connection.query(insertCommentQuery, insertCommentParams);

            await connection.commit(); // COMMIT
            connection.release();

            return res.json({
                isSuccess: true,
                code: 200,
                message: "댓글 작성이 완료되었습니다"
            });
        } catch (err) {
            connection.release();
            logger.error(`App - Insert Comment Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Insert Comment Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

//  33. 댓글 삭제 ------------------------------------------------------------//

exports.deleteComment = async function (req, res) {
    const id= req.verifiedToken.id;
    const cid= req.params.commentId;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const deleteCommentQuery = `   
                UPDATE comment
                SET status='DELETED'
                WHERE idx=? AND userId=?;
                    `;
            const deleteCommentParams = [cid, id];
            await connection.query(deleteCommentQuery, deleteCommentParams);

            await connection.commit(); // COMMIT
            connection.release();

            return res.json({
                isSuccess: true,
                code: 200,
                message: "댓글이 삭제되었습니다"
            });
        } catch (err) {
            connection.release();
            logger.error(`App - Delete Comment Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Delete Comment DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};
// 34. 댓글 좋아요------------------------------------------------------------//

exports.likeComment = async function (req, res) {
    const id= req.verifiedToken.id;
    const cid = req.body.commentId;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {            

            const likeCommentQuery = `
                insert likeInfo(userId, type, likeId) values
                (?, 2, ?);
                    `;
            const likeCommentParams = [id, cid ];
            await connection.query(likeCommentQuery, likeCommentParams);

            await connection.commit(); // COMMIT
            connection.release();

            return res.json({
                isSuccess: true,
                code: 200,
                message: "댓글 좋아요가 완료되었습니다"
            });
        } catch (err) {
            connection.release();
            logger.error(`App - like Comment Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - like Comment Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

// 35. 답글 달기 createRecomment------------------------------------------------------------//
exports.createRecomment = async function (req, res) {
    const id= req.verifiedToken.id;//회원id
    const content= req.body.content;
    const cid=req.body.commentId;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {            

            const insertRecommentQuery = `
                insert recomment(userId, commentId, content) values
                (?,?,?);
                    `;
            const insertRecommentParams = [id, cid, content];
            await connection.query(insertRecommentQuery, insertRecommentParams);

            await connection.commit(); // COMMIT
            connection.release();

            return res.json({
                isSuccess: true,
                code: 200,
                message: "대댓글 작성이 완료되었습니다"
            });
        } catch (err) {
            connection.release();
            logger.error(`App - Insert Recomment Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Insert Recomment Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

//  36. 제목 검색 ------------------------------------------------------------//

exports.search = async function (req, res) {

    const id= req.verifiedToken.id;
    const word = req.query.word;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {

            const searchQuery = `
            
                select title, concat(left(content, 20), '...')
                from board
                where title like '%${word}%' and status='ACTIVE';

                    `;
            const searchParams = [word];
            const [search] = await connection.query(searchQuery, searchParams);

            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                result:search[0],
                isSuccess: true,
                code: 200,
                message: "검색에 성공했습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Search Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Search DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

//  37. 작성한 게시물 보기 ------------------------------------------------------------//

exports.userBoard = async function (req, res) {
    const id= req.verifiedToken.id;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const getUserBoardQuery = `

                SELECT b.title, b.content, u.nickname, b.img
                FROM board AS b JOIN userInfo AS u ON u.idx = b.userId AND b.status != 'DELETED'
                WHERE u.idx = ?
                ORDER BY b.idx DESC;
                `    ;

            const getUserBoardParams = [id];

            const[getUserBoardRows]= await connection.query(getUserBoardQuery, getUserBoardParams);

            await connection.commit(); // COMMIT
            connection.release();
            
            res.json({
                list:getUserBoardRows[0],
                isSuccess: true,
                code: 200,
                message: "작성자 게시글 조회 성공"
            });
            
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get User Board Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get User Board DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};


// 38. 북마크 목록 보기 ------------------------------------------------------------//
exports.userMark = async function (req, res) {
    const id= req.verifiedToken.id;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const getUserMarkQuery = `

                select b.title #, b의 좋아요개수, 댓글 개수
                from bookmark as m left join board as b on m.boardId=b.idx
                where b.userId=? and (b.status='ACTIVE' and m.status='ACTIVE');
                `    ;

            const getUserMarkParams = [id];

            const[getUserMarkRows]= await connection.query(getUserMarkQuery, getUserMarkParams);

            await connection.commit(); // COMMIT
            connection.release();
            
            res.json({
                list:getUserMarkRows[0],
                isSuccess: true,
                code: 200,
                message: "작성자 게시글 조회 성공"
            });
            
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get User Mark Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get User Mark DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};
