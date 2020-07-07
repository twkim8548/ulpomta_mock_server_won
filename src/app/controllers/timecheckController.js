
const {pool} = require('../../../config/database');
const {logger} = require('../../../config/winston');

const jwt = require('jsonwebtoken');


//14. 과목별 공부시간 조회

exports.getSubTimeCheck = async function (req, res) {
    const id= req.verifiedToken.id;
    const year= req.query.year;
    const month= req.query.month;
    const day= req.query.day;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {

            const status1Query = `    

            select sec_to_time(sum(timestampdiff(second, startedAt, finishedAt))) as total 
            from timeCheck
            where userId=?  and  year(date)=? and month(date)=? and day(date)=?
            limit 1;
                         `    ;

            const statusParams = [id,year, month, day];
            const [status1Rows]=await connection.query(status1Query,statusParams);

            const status2Query = `   
            
            select timeDetail as subject, 
                ifnull( sec_to_time(sum(timestampdiff(second, startedAt,
                 finishedAt))),'00:00:00') as time
            from timeCheck
            where userId=?  and  year(date)=? and month(date)=? and day(date)=? and timeType =1
            group by timeDetail
            order by timeDetail;

                         `    ;

      
            const [status2Rows]=await connection.query(status2Query,statusParams);


            const stat2_1={};

            for(var i= 0; i<status2Rows.length;i++){
                var newSubject = status2Rows[i].subject;
                var newTime = status2Rows[i].time;
                stat2_1[newSubject]=newTime; 
            }

            await connection.commit(); // COMMIT
            connection.release();

    

            res.json({
                timeInfo: status1Rows[0],
                subjectTime:stat2_1,
                isSuccess: true,
                code: 200,
                message: "홈 화면 조회 성공"
            });

        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get Home Info Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get Home Info DB Connection error\n: ${err.message}`);
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
//총공부시간, 과목공부시간, 현재집중시간, 공부하는 멤버

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



//21.일간 통계
//날짜. 총공부시간/ 최대집중시간/ 시작시간/ 종료시간
//과목별 공부량: 과목/ 시간/ 비율
//공부 휴식비율:공부. 휴식. 그외 /시간/ 비율
//타임라인 로그

exports.getDailyStatus = async function (req, res) {
    const id= req.verifiedToken.id;
    const year= req.query.year;
    const month= req.query.month;
    const day= req.query.day;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const status1Query = `    

            select hour(sec_to_time(sum(timestampdiff( second, startedAt, finishedAt)))) as sect,
            sec_to_time(sum(timestampdiff(second, startedAt, finishedAt))) as total ,
            sec_to_time(max(timestampdiff(second, startedAt, finishedAt))) as max,
            time((min(startedAt))) as start,
            time((max(finishedAt))) as finish
            from timeCheck
            where userId=?  and  year(date)=? and month(date)=? and day(date)=?
            limit 1;
                         `    ;

            const statusParams = [id,year, month, day];
            const [status1Rows]=await connection.query(status1Query,statusParams);

            const statusParams2=[year, month, day,id,year, month, day];


            const status2Query = `    

            #과목별 공부량: 과목/ 시간/ 비율
            select timeDetail as subject, 
                sec_to_time(sum(timestampdiff(second, startedAt, finishedAt))) as time,
                concat(round(  sum(timestampdiff(second, startedAt, finishedAt) )/ 
                (select sum(timestampdiff(second, startedAt, finishedAt))
	            from timeCheck where year(date)=? and month(date)=? and day(date)=? and timeType =1)  *100),"%") as rate
            from timeCheck
            where userId=?  and  year(date)=? and month(date)=? and day(date)=? and timeType =1
            group by timeDetail;
                         `    ;

      
            const [status2Rows]=await connection.query(status2Query,statusParams2);


            const stat2_1={};

            for(var i= 0; i<status2Rows.length;i++){
                var newSubject = status2Rows[i].subject;
                var newTime = status2Rows[i].time;
                stat2_1[newSubject]=newTime; 
            }

            const stat2_2={};

            for(var i= 0; i<status2Rows.length;i++){
                var newSubject = status2Rows[i].subject;
                var newRate = status2Rows[i].rate;
                stat2_2[newSubject]=newRate; 
            }



            const status3Query = `    


            select (case when timeType=1 then '공부'
                when timeType=0 and timeDetail is not null then '휴식'
                when timeType=0 and timeDetail is null then '그외' end) as timeType1, 
                sec_to_time (sum(timestampdiff(second, startedAt, finishedAt)) )as time,
                concat(round(  sum(timestampdiff(second, startedAt, finishedAt) )/ 
                (select sum(timestampdiff(second, startedAt, finishedAt))
                from timeCheck  where year(date)=? and month(date)=? and day(date)=?)  *100),"%") as rate
            from timeCheck
            where userId=?  and year(date)=? and month(date)=? and day(date)=?
            group by timeType1;
                         `    ;

            const [status3Rows]=await connection.query(status3Query,statusParams2);

            const stat3_1={};

            for(var i= 0; i<status3Rows.length;i++){
                var newtimeType = status3Rows[i].timeType1;
                var newTime = status3Rows[i].time;
                stat3_1[newtimeType]=newTime; 
            }

            const stat3_2={};

            for(var i= 0; i<status3Rows.length;i++){
                var newtimeType = status3Rows[i].timeType1;
                var newRate = status3Rows[i].rate;
                stat3_2[newtimeType]=newRate; 
            }
    
            await connection.commit(); // COMMIT
            connection.release();

            
            res.json({
                result:{//jwt: status2Rows,
                timeInfo: status1Rows[0],
                subjectTime:stat2_1,
                subjectRate:stat2_2,
                timeTypeTume:stat3_1,
                timeTypeRate:stat3_2},
                
                isSuccess: true,
                code: 200,
                message: "일간 통계 조회 성공"
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




//21.일간 통계
//날짜. 총공부시간/ 최대집중시간/ 시작시간/ 종료시간
//과목별 공부량: 과목/ 시간/ 비율
//공부 휴식비율:공부. 휴식. 그외 /시간/ 비율
//타임라인 로그

exports.getDailyTime = async function (req, res) {
    const id= req.verifiedToken.id;
    const year= req.query.year;
    const month= req.query.month;
    const day= req.query.day;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const status1Query = `    

            select hour(sec_to_time(sum(timestampdiff( second, startedAt, finishedAt)))) as sect,
            sec_to_time(sum(timestampdiff(second, startedAt, finishedAt))) as total ,
            sec_to_time(max(timestampdiff(second, startedAt, finishedAt))) as max,
            time((min(startedAt))) as start,
            time((max(finishedAt))) as finish
            from timeCheck
            where userId=?  and  year(date)=? and month(date)=? and day(date)=?
            limit 1;
                         `    ;

            const statusParams = [id,year, month, day];
            const [status1Rows]=await connection.query(status1Query,statusParams);

    
            await connection.commit(); // COMMIT
            connection.release();

            
            res.json({
                timeInfo: status1Rows[0],
                isSuccess: true,
                code: 200,
                message: "일간 시간 조회 성공"
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


exports.getWeeklyTime = async function (req, res) {
    const id= req.verifiedToken.id;
    const y= req.query.year;
    const m= req.query.month;
    //const d= req.query.day;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const status1Query = `    

            select 
            sec_to_time(sum(timestampdiff(second, startedAt, finishedAt))) as total ,
            sec_to_time(round(sum(timestampdiff(second, startedAt, finishedAt))/7)) as avg
            from timeCheck
            where userId=?  and year(date)=? and month(date)=?
            limit 1;
                         `    ;

            const statusParams = [id,y, m];
            const [status1Rows]=await connection.query(status1Query,statusParams);

    
            await connection.commit(); // COMMIT
            connection.release();

            
            res.json({
                timeInfo: status1Rows[0],
                isSuccess: true,
                code: 200,
                message: "주간 시간 조회 성공"
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


exports.getMonthlyTime = async function (req, res) {
    const id= req.verifiedToken.id;
    const y= req.query.year;
    const m= req.query.month;
    //const d= req.query.day;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const status1Query = `    

            select 
            sec_to_time(sum(timestampdiff(second, startedAt, finishedAt))) as total ,
            sec_to_time(round(sum(timestampdiff(second, startedAt, finishedAt))/31)) as avg
            from timeCheck
            where userId=?  and year(date)=? and month(date)=?
            limit 1;
                         `    ;

            const statusParams = [id,y, m];
            const [status1Rows]=await connection.query(status1Query,statusParams);

    
            await connection.commit(); // COMMIT
            connection.release();

            
            res.json({
                timeInfo: status1Rows[0],
                isSuccess: true,
                code: 200,
                message: "월간 시간 조회 성공"
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

