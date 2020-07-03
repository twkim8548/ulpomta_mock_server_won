
const {pool} = require('../../../config/database');
const {logger} = require('../../../config/winston');

const jwt = require('jsonwebtoken');

//그룹 생성

exports.createGroup = async function (req, res) {
    const id= req.verifiedToken.id;//회원id
    const {
        name, category, dailyGoal, maxCount, pswd, message 
    } = req.body;
    

    if (name.length<2) return res.json({isSuccess: false, code: 301, message: "그룹명은 2글자 이상이어야 합니다"});
    if(!category) return res.json({isSuccess: false, code: 302, message: "카테고리를 선택해주세요"});
    if(!dailyGoal) return res.json({isSuccess: false, code: 303, message: "목표시간을 선택해주세요"});
    if(!maxCount) return res.json({isSuccess: false, code: 304, message: "모집인원을 선택해주세요"});
    if(!message) return res.json({isSuccess: false, code: 305, message: "그룹 설명은 5자 이상 적어주세요"});

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {            
            // 그룹명 중복 확인
            const selectGroupQuery = `
                SELECT groupInfo.name 
                FROM groupInfo , userInfo
                WHERE groupInfo.name = ? AND userInfo.idx = ? ;
                `;
            const selectGroupParams = [name, id];
            const [groupRows] = await connection.query(selectGroupQuery, selectGroupParams);

            if (groupRows.length > 0) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 306,
                    message: "이미 사용중인 그룹 이름입니다."
                });
            }

            await connection.beginTransaction(); // START TRANSACTION

            const insertGroupQuery = `
                INSERT INTO groupInfo(leader, name, category, dailyGoal, maxCount, pswd, message )
                VALUES (?,?,?,?,?,?,?);
                    `;
            const insertGroupParams = [id,name, category, dailyGoal, maxCount, pswd, message ];
            await connection.query(insertGroupQuery, insertGroupParams);

            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                isSuccess: true,
                code: 200,
                message: "그룹 추가가 완료되었습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Insert Group Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Insert Group Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};


//그룹 해체

exports.deleteGroup = async function (req, res) {
    const sid = req.params.gid;//삭제할 그룹 id
    const id= req.verifiedToken.id;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {

            await connection.beginTransaction(); // START TRANSACTION

            const deleteGroupQuery = `

                UPDATE groupInfo
                SET status = 'DELETED'
                WHERE idx =? AND leader= ?;
                    `;
            const deleteGroupParams = [sid, id];
            await connection.query(deleteGroupQuery, deleteGroupParams);

            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                isSuccess: true,
                code: 200,
                message: "그룹이 삭제되었습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            //logger.error(`App - Delete Group Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
       // logger.error(`App - Delete Group DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};