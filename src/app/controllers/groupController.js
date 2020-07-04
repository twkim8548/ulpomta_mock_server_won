
const {pool} = require('../../../config/database');
const {logger} = require('../../../config/winston');

const jwt = require('jsonwebtoken');

//28. 그룹 생성

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

//24. 가입된 그룹 조회

exports.getUserGroupInfo = async function (req, res) {
    const id= req.verifiedToken.id;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            //조회정보 다시 출석률같은 그룹정보 포함해서 쿼리 수정하기!!!!!!!!!
            const getUserGroupInfoQuery = `

                select groupId
                from userGroupList
                where userId= ? and status='ACTIVE'; 
                `    ;

            const getUserGroupInfoParams = [id];

            const[userGroupInfoRows]= await connection.query(getUserGroupInfoQuery, getUserGroupInfoParams);

            await connection.commit(); // COMMIT
            connection.release();

            
            res.json({
                userGroupInfo: userGroupInfoRows[0],
                isSuccess: true,
                code: 200,
                message: "조회에 성공했습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get UserGroupInfo Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get UserGroupInfo DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};



//30. 그룹 가입

exports.createUserGroup = async function (req, res) {
    const id= req.verifiedToken.id;//회원id
    const gid = req.params.gid;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {            
            // 가입된 그룹인지
            const selectUserGroupQuery = `
                select *
                from userGroupList
                where userId= ? and groupId=? and status='ACTIVE';
                `;
            const selectUserGroupParams = [id, gid];
            const [userGroupRows] = await connection.query(selectUserGroupQuery, selectUserGroupParams);

            if (userGroupRows.length > 0) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 306,
                    message: "이미 가입된 그룹입니다."
                });
            }

            await connection.beginTransaction(); // START TRANSACTION

            const insertGroupQuery = `
                
                INSERT userGroupList(groupId, userId) values
                (?, ?);
                    `;
            const insertGroupParams = [gid, id];
            await connection.query(insertGroupQuery, insertGroupParams);

            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                isSuccess: true,
                code: 200,
                message: "가입이 완료되었습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Insert UserGroup Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Insert UserGroup Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};


//34. 그룹 탈퇴

exports.deleteUserGroup = async function (req, res) {
    const id= req.verifiedToken.id;//회원id
    const gid = req.params.gid;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {            
            //가입 여부 확인할 필요 없겠지 ...??
            const updateUserGroupQuery = `
                
                update userGroupList
                set status='DELETE'
                where userId=? and groupId=?;
                    `;
            const updateUserGroupParams = [id, gid];
            await connection.query(updateUserGroupQuery, updateUserGroupParams);

            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                isSuccess: true,
                code: 200,
                message: "탈퇴가 완료되었습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - update UserGroup Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Update UserGroup Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

//35. 그룹 수정
exports.updateGroup = async function (req, res) {

    const sid = req.params.gid;//변경할 과목 id
    const id= req.verifiedToken.id;

    const {
        name, category, dailyGoal, maxCount, pswd, message 
    } = req.body;


    if (name.length<1) return res.json({isSuccess: false, code: 301, message: "1글자 이상이어야 합니다."});


    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            // 그룹명 중복 확인
            const selectGroupQuery = `
                SELECT idx, name 
                FROM groupInfo 
                WHERE name = ? ;
                `;
            const selectGroupParams = [name];
            const [SubjectRows] = await connection.query(selectGroupQuery, selectGroupParams);

            if (SubjectRows.length > 0) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 302,
                    message: "이미 존재하는 그룹입니다."
                });
            }

            await connection.beginTransaction(); // START TRANSACTION
            
            //그룹 수정 권한 확인 필요...
            const updateGroupQuery = `
                UPDATE groupInfo
                SET name=?, category=?, dailyGoal=?, maxCount=?, pswd=?, message =?
                where idx =? ;
                    `;
            const updateGroupParams = [name, category, dailyGoal, maxCount, pswd, message , sid];
            await connection.query(updateGroupQuery, updateGroupParams);

            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                isSuccess: true,
                code: 200,
                message: "그룹 정보 변경이 완료되었습니다"
            });

        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            //logger.error(`App - Update Group Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        //logger.error(`App - Update Group DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};


//36. 그룹 해체

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