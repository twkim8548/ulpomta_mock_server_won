
const {pool} = require('../../../config/database');
const {logger} = require('../../../config/winston');

const jwt = require('jsonwebtoken');


//24. 가입된 그룹 조회

exports.getUserGroupInfo = async function (req, res) {
    const id= req.verifiedToken.id;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            //조회정보 다시 출석률같은 그룹정보 포함해서 쿼리 수정하기!!!!!!!!!
            //카테고리 , 이름, 목표, 인원, 그룹장 , 평균 출석률, 출석률 순위, 평균 공부량, 공부량 순위, 시작일
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

            //정원 확인하기

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


//25. 전체 그룹 조회. 홍보시간 기준
exports.getGroupList= async function (req, res) {
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            //카테고리, 이름, 목표, 인원(가입/전체), 그룹장, 평균 출석률, 평균 공부량, 시작일, 홍보, 공지
            //인원 받아올 때 전체 인원이랑 가입중인 인원 받아오기/ 
            //그룹장 닉네임으로 받아오기/ 비밀번호는 공개여부로 확인
            const getGroupInfoQuery = `
                select 
                from groupInfo
                order by promotedAt

                //글 리스트 50개 뽑고 더보기하면 더 뽑고 이런식으로 !! 이건 클라에서 조절하는건가요?

                ;   
                `    ;

            const getGroupInfoParams = [gid];//파라미터 없이 어떻게 하지...????

            const[groupInfoRows]= await connection.query(getGroupInfoQuery, getGroupInfoParams);

            await connection.commit(); // COMMIT
            connection.release();

            
            
            res.json({
                groupInfo: groupInfoRows,
                isSuccess: true,
                code: 200,
                message: "조회에 성공했습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get GroupList Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get GroupList DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};


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
                WHERE groupInfo.name = ? AND userInfo.idx = ? AND status='ACTIVE';
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


//33. 그룹 들어가서 상단탭 정보조회 //가입된 사람만 조회가능-group-user리스트에 있는지 확인
    //그룹장의 경우 조회하는 정보 다르게??아님 그룹장 조회 api를 ㅏ똘 받나요
exports.getGroupInfo = async function (req, res) {
    const id= req.verifiedToken.id;
    const gid = req.params.gid;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {

            const getUserGroupQuery = `
                select idx
                from userGroupInfo
                where groupId=? and userId=? and status='ACTIVE';   
                `    ;

            const getUserGroupParams = [gid, id];

            const[getUserGroupRows]= await connection.query(getUserGroupQuery, getUserGroupParams);

            if (getUserGroupRows.length < 1) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 310,
                    message: "그룹에 가입해야 이용할 수 있습니다. 그룹에 가입하시겠습니까?"
                });
            }

            await connection.beginTransaction(); // START TRANSACTION
            //
            const getGroupInfoQuery = `
                select g.category, g.dailygoal, g.leader, ()as public
                from userGroupInfo left join groupInfo
                where groupId=? and userId=? and status='ACTIVE';   
                `    ;

            const getGroupInfoParams = [gid, id];

            const[getGroupInfoRows]= await connection.query(getGroupInfoQuery, getGroupInfoParams);



            await connection.commit(); // COMMIT
            connection.release();

            
            
            res.json({
                groupInfo: groupInfoRows[0],
                isSuccess: true,
                code: 200,
                message: "조회에 성공했습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get GroupInfo Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get Group DB Connection error\n: ${err.message}`);
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

//35. 그룹 수정(그룹장의 경우)
exports.updateGroup = async function (req, res) {

    const gid = req.params.gid;//변경할 과목 id
    const id= req.verifiedToken.id;

    const {
        name, category, dailyGoal, maxCount, pswd, message 
    } = req.body;


    if (name.length<1) return res.json({isSuccess: false, code: 301, message: "1글자 이상이어야 합니다."});


    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            // //그룹 수정 권한 확인 ... 이건 클라에서 처리하는건가요??
            // const selectGroupQuery = `
            //     SELECT g.idx, g.name 
            //     FROM groupInfo as g left join userInfo as u on g.leader= u.idx
            //     WHERE g.idx =? AND u.idx=?;
            //     `;
            // const selectGroupParams = [gid, id];
            // const [SubjectRows] = await connection.query(selectGroupQuery, selectGroupParams);

            // if (SubjectRows.length < 0) {
            //     connection.release();
            //     return res.json({
            //         isSuccess: false,
            //         code: 302,
            //         message: "수정 권한이 없습니다"
            //     });
            // }

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

            const updateGroupQuery = `
                UPDATE groupInfo
                SET name=?, category=?, dailyGoal=?, maxCount=?, pswd=?, message =?
                where idx =? ;
                    `;
            const updateGroupParams = [name, category, dailyGoal, maxCount, pswd, message , gid];
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
            //디비에서 userGroupList 어떻게되는지 확인해보기...
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