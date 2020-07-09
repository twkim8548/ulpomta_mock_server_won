
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

            SELECT b.tag, b.title, b.userId, if(img is not null, 1, 0)as existimg,
            (SELECT COUNT(idx) FROM comment as c WHERE c.boardId = b.idx and c.status='ACTIVE') AS commentCount,
                (CASE
                WHEN TIMESTAMPDIFF(SECOND, b.createdAt, CURRENT_TIMESTAMP) < 60
                then CONCAT(TIMESTAMPDIFF(SECOND, b.createdAt, CURRENT_TIMESTAMP), ' 초전')
                WHEN TIMESTAMPDIFF(MINUTE, b.createdAt, CURRENT_TIMESTAMP) < 60
                then CONCAT(TIMESTAMPDIFF(MINUTE, b.createdAt, CURRENT_TIMESTAMP), ' 분전')
                WHEN TIMESTAMPDIFF(HOUR, b.createdAt, CURRENT_TIMESTAMP) < 24
                then CONCAT(TIMESTAMPDIFF(HOUR, b.createdAt, CURRENT_TIMESTAMP), ' 시간 전')
                else CONCAT(TIMESTAMPDIFF(DAY, b.createdAt, CURRENT_TIMESTAMP), ' 일 전')
                END) AS createAt
            FROM board AS b LEFT JOIN userInfo AS u
                ON u.idx = b.userId AND b.status != 'DELETED'
            WHERE b.category=u.category and u.idx=?
            ORDER BY b.idx DESC;
               
                `    ;

            const getCateBoardListParams = [id];

            const[cateBoardList]= await connection.query(getCateBoardList, getCateBoardListParams);

            await connection.commit(); // COMMIT
            connection.release();

            
            res.json({
                list:cateBoardList,
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

            SELECT b.tag, b.title, b.userId,if(img is not null, 1, 0)as existimg,
                (SELECT COUNT(idx) FROM comment as c WHERE c.boardId = b.idx and c.status='ACTIVE') AS commentCount,
                    (CASE
                    WHEN TIMESTAMPDIFF(SECOND, b.createdAt, CURRENT_TIMESTAMP) < 60
                    then CONCAT(TIMESTAMPDIFF(SECOND, b.createdAt, CURRENT_TIMESTAMP), ' 초전')
                    WHEN TIMESTAMPDIFF(MINUTE, b.createdAt, CURRENT_TIMESTAMP) < 60
                    then CONCAT(TIMESTAMPDIFF(MINUTE, b.createdAt, CURRENT_TIMESTAMP), ' 분전')
                    WHEN TIMESTAMPDIFF(HOUR, b.createdAt, CURRENT_TIMESTAMP) < 24
                    then CONCAT(TIMESTAMPDIFF(HOUR, b.createdAt, CURRENT_TIMESTAMP), ' 시간 전')
                    else CONCAT(TIMESTAMPDIFF(DAY, b.createdAt, CURRENT_TIMESTAMP), ' 일 전')
                    END) AS createAt
            FROM board AS b LEFT JOIN userInfo AS u
                ON u.idx = b.userId AND b.status != 'DELETED'
            #WHERE b.category=null
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
            connection.release();
            logger.error(`App - Get Board List Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get Board List DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

//    27. 상세글보기------------------------------------------------------------//

exports.boardInfo = async function (req, res) {
    const id= req.verifiedToken.id;
    const bid= req.query.boardId;
    
    if (!bid) return res.json({isSuccess: false, code: 301, message: "조회할 글을 입력해주세요"});
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const getBoardInfo = `
    
            SELECT title, content, userId, img, 
                (CASE
                WHEN TIMESTAMPDIFF(SECOND, b.createdAt, CURRENT_TIMESTAMP) < 60
                then CONCAT(TIMESTAMPDIFF(SECOND, b.createdAt, CURRENT_TIMESTAMP), ' 초전')
                WHEN TIMESTAMPDIFF(MINUTE, createdAt, CURRENT_TIMESTAMP) < 60
                then CONCAT(TIMESTAMPDIFF(MINUTE, createdAt, CURRENT_TIMESTAMP), ' 분전')
                WHEN TIMESTAMPDIFF(HOUR, createdAt, CURRENT_TIMESTAMP) < 24
                then CONCAT(TIMESTAMPDIFF(HOUR, createdAt, CURRENT_TIMESTAMP), ' 시간 전')
                else CONCAT(TIMESTAMPDIFF(DAY, createdAt, CURRENT_TIMESTAMP), ' 일 전')
                END )AS boardCreatedAt,
                (select count(userId) 
                from likeInfo
                where type=1 and likeId=? and status='ACTIVE')as likecount,
                (select count(idx)
                from bookmark
                where boardId=? and userId=? and status='ACTIVE')as bookmark #내가 했으면 1
            FROM board as b
            WHERE status='ACTIVE' and idx=? ;
                `    ;

            const getBoardParams = [bid, bid, id, bid];

            const[boardInfo]= await connection.query(getBoardInfo, getBoardParams);


            const getCommentInfo = `
                    
            SELECT  c.userId, c.content, 
            (CASE
            WHEN TIMESTAMPDIFF(MINUTE, c.createdAt, CURRENT_TIMESTAMP) < 60
            then CONCAT(TIMESTAMPDIFF(MINUTE, c.createdAt, CURRENT_TIMESTAMP), ' 분전')
            WHEN TIMESTAMPDIFF(HOUR, c.createdAt, CURRENT_TIMESTAMP) < 24
            then CONCAT(TIMESTAMPDIFF(HOUR, c.createdAt, CURRENT_TIMESTAMP), ' 시간 전')
            else CONCAT(TIMESTAMPDIFF(DAY, c.createdAt, CURRENT_TIMESTAMP), ' 일 전')
            END )AS commentCreatedAt
            FROM board as b left join comment as c on b.idx=c.boardId
            WHERE b.idx=? and b.status='ACTIVE' and c.status='ACTIVE';
                `    ;

            const getCommentParams = [bid];

            const[CommentInfo]= await connection.query(getCommentInfo, getCommentParams);

            await connection.commit(); // COMMIT
            connection.release();
            
            res.json({
                board:boardInfo[0],
                commentlist:CommentInfo,
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

    
    if (!title) return res.json({isSuccess: false, code: 301, message: "제목을 입력해주세요"});
    if (!content) return res.json({isSuccess: false, code: 302, message: "내용을 입력해주세요"});

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
    const bid= req.query.boardId;

    if (!bid) return res.json({isSuccess: false, code: 301, message: "삭제할 글을 입력해주세요"});
   
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
    if (!bid) return res.json({isSuccess: false, code: 301, message: "좋아요 할 글을 입력해주세요"});
   

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
    
    if (!bid) return res.json({isSuccess: false, code: 301, message: "북마크 할 글을 입력해주세요"});

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
    
    if (!bid) return res.json({isSuccess: false, code: 301, message: "댓글 작성할 글을 입력해주세요"});
    if (!content) return res.json({isSuccess: false, code: 302, message: "내용을 입력해주세요"});

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
    
    if (!cid) return res.json({isSuccess: false, code: 301, message: "삭제할 댓글을 입력해주세요"});

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
    
    if (!cid) return res.json({isSuccess: false, code: 301, message: "좋아요할 댓글을 입력해주세요"});

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

// 35. 답글 달기 createRecomment---------------------------------------------------- --------//
exports.createRecomment = async function (req, res) {
    const id= req.verifiedToken.id;//회원id
    const content= req.body.content;
    const cid=req.body.commentId;
    const bid=req.body.boardId;

    
    if (!cid) return res.json({isSuccess: false, code: 301, message: "답글 달 댓글을 입력해주세요"});
    if (!content) return res.json({isSuccess: false, code: 302, message: "내용을 입력해주세요"});

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {            

            const insertRecommentQuery = `
                
            insert comment(userId, boardId, commentId, content) values
                (?,?, ?,?);
                    `;
            const insertRecommentParams = [id, bid, cid, content];
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
    
    if (word.length<2) return res.json({isSuccess: false, code: 301, message: "검색어는 2자 이상 입력해주세요"});

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {

            const searchQuery = `
            
                select title, concat(left(content, 20), '...') as preview
                from board
                where title like '%${word}%' and status='ACTIVE'
                limit 20;
                    `;
            const searchParams = [word];
            const [search] = await connection.query(searchQuery, searchParams);

            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                result:search,
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

            SELECT  b.title, count(l.idx) as likeCount, count(c.idx) as commentCount
            FROM  board AS b  LEFT JOIN userInfo AS u 
                ON u.idx = b.userId AND b.status != 'DELETED'
                LEFT JOIN likeInfo as l on b.idx=l.likeId
                LEFT JOIN comment as c on b.idx=c.boardId
            WHERE u.idx = ?
            group by b.idx
            ORDER BY b.idx DESC;

                `    ;

            const getUserBoardParams = [id];

            const[getUserBoardRows]= await connection.query(getUserBoardQuery, getUserBoardParams);

            await connection.commit(); // COMMIT
            connection.release();
            
            res.json({
                list:getUserBoardRows,
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

            select b.title, count(l.idx) as likeCount, count(c.idx) as commentCount
            from bookmark as m join board as b on m.boardId=b.idx
                LEFT JOIN likeInfo as l on b.idx=l.likeId
                LEFT JOIN comment as c on b.idx=c.boardId
            where b.userId=? and (b.status='ACTIVE' and m.status='ACTIVE')
            group by b.idx;
                `    ;

            const getUserMarkParams = [id];

            const[getUserMarkRows]= await connection.query(getUserMarkQuery, getUserMarkParams);

            await connection.commit(); // COMMIT
            connection.release();
            
            res.json({
                list:getUserMarkRows,
                isSuccess: true,
                code: 200,
                message: "북마크 목록 조회 성공"
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

//답댓글 펼치기


exports.getRecomment = async function (req, res) {
    const cid=req.body.commentId;

    if (!cid) return res.json({isSuccess: false, code: 301, message: "조회할 댓글을 선택해주세요"});

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {            

            const getRecommentQuery = `
                
            select c1.idx , c2.userId, c2.content,
		        (CASE
                WHEN TIMESTAMPDIFF(SECOND, c2.createdAt, CURRENT_TIMESTAMP) < 60
                then CONCAT(TIMESTAMPDIFF(SECOND, c2.createdAt, CURRENT_TIMESTAMP), ' 초전')
                WHEN TIMESTAMPDIFF(MINUTE, c2.createdAt, CURRENT_TIMESTAMP) < 60
                then CONCAT(TIMESTAMPDIFF(MINUTE, c2.createdAt, CURRENT_TIMESTAMP), ' 분전')
                WHEN TIMESTAMPDIFF(HOUR, c2.createdAt, CURRENT_TIMESTAMP) < 24
                then CONCAT(TIMESTAMPDIFF(HOUR, c2.createdAt, CURRENT_TIMESTAMP), ' 시간 전')
                else CONCAT(TIMESTAMPDIFF(DAY, c2.createdAt, CURRENT_TIMESTAMP), ' 일 전')
                END )AS CreatedAt
            from comment c1 left join comment c2 on c1.idx=c2.commentId
            where c1.idx=? and c1.status='ACTIVE' and c2.status='ACTIVE'
                    `;
            const getRecommentParams = [cid];
            const recomment =await connection.query(getRecommentQuery, getRecommentParams);

            await connection.commit(); // COMMIT
            connection.release();

            return res.json({
                list:recomment[0],
                isSuccess: true,
                code: 200,
                message: "대댓글 조회가 완료되었습니다"
            });
        } catch (err) {
            connection.release();
            logger.error(`App - Select Recomment Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Select Recomment DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};
