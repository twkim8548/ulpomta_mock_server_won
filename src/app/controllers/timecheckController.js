
const {pool} = require('../../../config/database');
const {logger} = require('../../../config/winston');

const jwt = require('jsonwebtoken');


//14. 과목별 공부시간 조회

exports.getSubTimeCheck = async function (req, res) {
    const id= req.verifiedToken.id;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const getSubTimeQuery = `
            select timeDetail, sec_to_time(sum(timediff( finishedAt, startedAt))) as subjectTime
            from timeCheck
            where userId=? and timeType=1 and date=curdate() and status='ACTIVE'
            group by timeDetail;
                `    ;

            const getSubTimeParams = [id];

            const[timeCheckRows]= await connection.query(getSubTimeQuery,getSubTimeParams);

            await connection.commit(); // COMMIT
            connection.release();

            res.json({
                subjectTimeInfo: timeCheckRows,
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


//15. 오늘의 총 공부시간

exports.getDailyTimeCheck = async function (req, res) {
    const id= req.verifiedToken.id;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const getDailyTimeQuery = `    
            select date(curdate()) as 날짜 , sec_to_time(sum(timestampdiff(second, startedAt, finishedAt))) as 공부시간
            from timeCheck
            where userId=? and date=curdate() and timetype=1 and status='ACTIVE'
                `    ;

            const getDailyTimeParams = [id];

            const[timeCheckRows]= await connection.query(getDailyTimeQuery,getDailyTimeParams);

            await connection.commit(); // COMMIT
            connection.release();

            res.json({
                timeInfo: timeCheckRows[0],
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
                select TIME_FORMAT(sec_to_time(sum(timestampdiff(second, startedAt,CURRENT_TIMESTAMP))), '%H 시간 %i 분 %s 초') as 휴식
                from timeCheck
                where idx=(SELECT MAX(idx) FROM timeCheck WHERE userId = ?);
                `    ;

            const getRestTimeParams = [id];

            const[timeCheckRows]= await connection.query(getRestTimeQuery,getRestTimeParams);

            await connection.commit(); // COMMIT
            connection.release();

            res.json({
                timeInfo: timeCheckRows[0],
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
        subjectName
    } = req.body;
    
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const finishRestTimeQuery = `    

                update timeCheck
                set finishedAt=current_timestamp()
                where userId=? and timeType=0 and date=curdate() and startedAt is not null and finishedAt is NULL;
                `    ;

            const finishRestTimeParams = [id];
            await connection.query(finishRestTimeQuery,finishRestTimeParams);

            await connection.beginTransaction(); // START TRANSACTION

            const startStudyTimeQuery = `    
                insert timeCheck(userID, date, timeType, timeDetail) values 
                (?, curdate(), 1, ?);
                `    ;

            const startStudyTimeParams = [id, subjectName];
            await connection.query(startStudyTimeQuery,startStudyTimeParams);


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

//17-1.시간 측정 시작 시 휴식 종류 업데이트 

exports.startTimeCheck2 = async function (req, res) {
    const id= req.verifiedToken.id;
    const {
        restName
    } = req.body;
    
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const finishRestTimeQuery = `    

                update timeCheck
                set timeDetail=?
                where userId=? and timeType=0 and date=curdate() 
                order by idx desc limit 1;
                `    ;

            const finishRestTimeParams = [restName, id];
            await connection.query(finishRestTimeQuery,finishRestTimeParams);

            await connection.commit(); // COMMIT
            connection.release();

            res.json({
                isSuccess: true,
                code: 200,
                message: "휴식 수정에 성공했습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - update Rest Time Check Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Update Rest Time Check DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

//18. 시간 측정 종료
exports.finishTimeCheck = async function (req, res) {
    const id= req.verifiedToken.id;
    const sid= req.query.sid;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const finishStudyTimeQuery = `    

                update timeCheck
                set finishedAt=current_timestamp()
                where userId=? and timeType=1 and date=curdate() and timeDetail=
                    (select name
					from subjectInfo
					where userId=? and idx=?);
                `    ;

            const finishStudyTimeParams = [id, id, sid];
            await connection.query(finishStudyTimeQuery,finishStudyTimeParams);

            await connection.beginTransaction(); // START TRANSACTION

            const startRestTimeQuery = `    

                insert timeCheck(userID, date, timeType) values 
                (?, curdate(), 0);
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
//총공부시간, 과목공부시간, 현재집중시간

exports.getTimeCheck = async function (req, res) {
    const id= req.verifiedToken.id;
    const sid= req.query.sid;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const getStudyTimeQuery = `    

            select (select sec_To_time(timestampdiff(second, 
                startedAt ,current_timestamp))
               from timeCheck
               where finishedAt is null and date=curdate() and timeType=1) as current
               , (select sec_to_time(sum(timestampdiff(second, startedAt, 
               if ( isnull(finishedAt), current_timestamp, finishedAt ))))
               from timeCheck 
               where date=curdate() and timeType=1 and timeDetail=
					(select name
					from subjectInfo
					where userId=? and idx=?))
				as subject
              ,(select sec_to_time(sum(timestampdiff(second, 
               startedAt, if ( isnull(finishedAt), 
               current_timestamp, finishedAt))))
               from timeCheck where date=curdate() and timeType=1)as total
           from timeCheck
           where userId=?
           limit 1;
                         `    ;

            const getStudyTimeParams = [id, sid, id];
            timeCheckRows=await connection.query(getStudyTimeQuery,getStudyTimeParams);

    
            await connection.commit(); // COMMIT
            connection.release();

            res.json({
                time:timeCheckRows[0],
                isSuccess: true,
                code: 200,
                message: "측정 조회에 성공했습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - get Time Check Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - get Time Check DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};