
const {pool} = require('../../../config/database');
const {logger} = require('../../../config/winston');

const jwt = require('jsonwebtoken');


//14. 과목별 공부시간, todo조회

exports.getSubTimeCheck = async function (req, res) {
    const id= req.verifiedToken.id;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const getSubTimeQuery = `

                select timedetail, sec_to_time(sum(timestampdiff(second, startedAt, finishedAt)))
                from timeCheck
                where userId=? and date=curdate() and status='ACTIVE'
                group by timedetail;   
                `    ;

            const getSubTimeParams = [id];

            const[timeCheckRows]= await connection.query(getSubTimeQuery,getSubTimeParams);

            await connection.commit(); // COMMIT
            connection.release();

            res.json({
                userInfo: timeCheckRows[0],
                isSuccess: true,
                code: 200,
                message: "조회에 성공했습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get SubTime Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get SubTime DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};


//15. 날짜별 총 공부시간

exports.getDailyTimeCheck = async function (req, res) {
    const id= req.verifiedToken.id;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const getDailyTimeQuery = `    
                select sec_to_time(sum(timestampdiff(second, startedAt, finishedAt)))
                from timeCheck
                where userId=? and date=curdate() and timetype='study' and status='ACTIVE';
                `    ;

            const getDailyTimeParams = [id];

            const[timeCheckRows]= await connection.query(getDailyTimeQuery,getDailyTimeParams);

            await connection.commit(); // COMMIT
            connection.release();

            res.json({
                userInfo: timeCheckRows[0],
                isSuccess: true,
                code: 200,
                message: "조회에 성공했습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get Daily Time Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get Daily Time DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

//16. 마지막 공부 이후 휴식시간

exports.getRestTimeCheck = async function (req, res) {
    const id= req.verifiedToken.id;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const getRestTimeQuery = `    
                select sec_to_time(sum(timestampdiff(second, startedAt,CURRENT_TIMESTAMP)))
                from timeCheck
                where idx=(SELECT MAX(idx) FROM timeCheck WHERE userId = ?);
                `    ;

            const getRestTimeParams = [id];

            const[timeCheckRows]= await connection.query(getRestTimeQuery,getRestTimeParams);

            await connection.commit(); // COMMIT
            connection.release();

            res.json({
                userInfo: timeCheckRows[0],
                isSuccess: true,
                code: 200,
                message: "조회에 성공했습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get Rest Time Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get Rest Time DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};
//17. 시간 측정 시작

exports.startTimeCheck = async function (req, res) {
    const id= req.verifiedToken.id;
    const {
        subjectName, restName
    } = req.body;
    
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const finishRestTimeQuery = `    
                SELECT @last_id := MAX(idx) FROM timeCheck;

                update timeCheck
                set finishedAt=current_timestamp(), timeDetail=?
                where userId=? and idx=@last_id and timeType=0 and date=curdate();
                `    ;

            const finishRestTimeParams = [restName, id];
            const[timeCheckRows]= await connection.query(finishRestTimeQuery,finishRestTimeParams);

            await connection.beginTransaction(); // START TRANSACTION

            const startStudyTimeQuery = `    
                insert timeCheck(userID, date, timeType, timeDetail) values 
                (?, curdate(), 1, ?);
                `    ;

            const startStudyTimeParams = [id, subjectName];
            const[timeCheckRows]= await connection.query(startStudyTimeQuery,startStudyTimeParams);


            await connection.commit(); // COMMIT
            connection.release();

            res.json({
                isSuccess: true,
                code: 200,
                message: "시간측정에 성공했습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Finish Time Check Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Finish Time Check DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};


//18. 시간 측정 종료
exports.finishTimeCheck = async function (req, res) {
    const id= req.verifiedToken.id;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const finishStudyTimeQuery = `    

                SELECT @last_id := MAX(idx) FROM timeCheck;

                update timeCheck
                set finishedAt=current_timestamp()
                where userId=? and idx=@last_id and timeType=1;
                `    ;

            const finishStudyTimeParams = [id];
            await connection.query(finishStudyTimeQuery,finishStudyTimeParams);

            await connection.beginTransaction(); // START TRANSACTION

            const startRestTimeQuery = `    
                insert timeCheck(userID, date, timeType) values 
                (?, curdate(), 1);
                `    ;

            const startRestTimeParams = [id];
            await connection.query(startRestTimeQuery,startRestTimeParams);


            await connection.commit(); // COMMIT
            connection.release();

            res.json({
                isSuccess: true,
                code: 200,
                message: "측정 종료에 성공했습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Finish Time Check Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Finish Time Check DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};
//19. 시간 측정 페이지