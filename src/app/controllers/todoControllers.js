
const {pool} = require('../../../config/database');
const {logger} = require('../../../config/winston');

const jwt = require('jsonwebtoken');

//08. todo 생성

exports.createSubject = async function (req, res) {
    const id= req.verifiedToken.id;//회원id
    const name = req.body.subjectName;//추가할 과목 이름

    if (name.length<1) return res.json({isSuccess: false, code: 301, message: "1글자 이상이어야 합니다."});

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {            
            // todo도 중복 확인함 !! 근데 진행사항 체크 되어있어야 알림창이 뜨고 진행사항없으면 그냥 무시하는듯 ...
            const selectSubjectQuery = `
                SELECT subjectInfo.name 
                FROM subjectInfo , userInfo
                WHERE subjectInfo.name = ? AND userInfo.idx = ? ;
                `;
            const selectSubjectParams = [name, id];
            const [SubjectRows] = await connection.query(selectSubjectQuery, selectSubjectParams);

            if (SubjectRows.length > 0) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 302,
                    message: "이미 존재하는 과목입니다."
                });
            }

            await connection.beginTransaction(); // START TRANSACTION

            const insertSubjectQuery = `
                INSERT INTO subjectInfo(userId, name)
                VALUES (?,?);
                    `;
            const insertSubjectParams = [id, name];
            await connection.query(insertSubjectQuery, insertSubjectParams);

            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                isSuccess: true,
                code: 200,
                message: "과목 추가가 완료되었습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Insert Subject Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Insert Subject Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

//09. todo 진행상황 체크
//10. todo 진행상황 조회
//11. todo 수정


exports.updateSubject = async function (req, res) {

    const sid = req.params.sid;//변경할 과목 id
    const id= req.verifiedToken.id;

    const name= req.body.subjectName;// 변경할 과목 이름


    if (name.length<1) return res.json({isSuccess: false, code: 301, message: "1글자 이상이어야 합니다."});


    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            // 과목명 중복 확인
            const selectSubjectQuery = `
                SELECT subjectInfo.name 
                FROM subjectInfo , userInfo
                WHERE subjectInfo.name = ? AND userInfo.idx = ? ;
                `;
            const selectSubjectParams = [name, id];
            const [SubjectRows] = await connection.query(selectSubjectQuery, selectSubjectParams);

            if (SubjectRows.length > 0) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 302,
                    message: "이미 존재하는 과목입니다."
                });
            }

            await connection.beginTransaction(); // START TRANSACTION

            const updateSubjectQuery = `
                UPDATE subjectInfo
                SET name=?
                where idx =? AND userId=?;
                    `;
            const updateSubjectParams = [name, sid, id];
            await connection.query(updateSubjectQuery, updateSubjectParams);

            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                isSuccess: true,
                code: 200,
                message: "과목 변경이 완료되었습니다"
            });

        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            //logger.error(`App - Update Subject Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        //logger.error(`App - Update Subject DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};
//12. todo 날짜별 조회
//13. todo 날짜별 조회(한달)


//07. 과목 삭제

exports.deleteSubject = async function (req, res) {
    const sid = req.params.sid;//변경할 과목 id
    const id= req.verifiedToken.id;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {

            await connection.beginTransaction(); // START TRANSACTION

            const deleteSubjectQuery = `

                UPDATE subjectInfo
                SET status = 'DELETED'
                WHERE idx =? AND userId= ?;
                    `;
            const deleteSubjectParams = [sid, id];
            await connection.query(deleteSubjectQuery, deleteSubjectParams);

            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                isSuccess: true,
                code: 200,
                message: "과목이 삭제되었습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            //logger.error(`App - Delete Catogory Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
       // logger.error(`App - Delete Catogory DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};