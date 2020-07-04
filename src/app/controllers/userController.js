const {pool} = require('../../../config/database');
const {logger} = require('../../../config/winston');

const jwt = require('jsonwebtoken');
const regexEmail = require('regex-email');
const crypto = require('crypto');
const secret_config = require('../../../config/secret');



/**
 update : 2019.11.01
 01.signUp API = 회원가입
 */
exports.signUp = async function (req, res) {
    const {
        email, password, nickname, category
    } = req.body;
 

    if (!email) return res.json({isSuccess: false, code: 301, message: "이메일 형식이 잘못되었습니다."});
    if (!regexEmail.test(email)) return res.json({isSuccess: false, code: 301, message: "이메일 형식이 잘못되었습니다."});

    if (!password) return res.json({isSuccess: false, code: 303, message: "비밀번호는 6글자 이상이어야 합니다."});
    if (password.length < 6 ) return res.json({
        isSuccess: false,
        code: 303,
        message: "비밀번호는 6글자 이상이어야 합니다."
    });

    if (nickname.length<2) return res.json({isSuccess: false, code: 305, message: "닉네임은 2글자 이상이어야 합니다."});
    if (nickname.length > 20) return res.json({
        isSuccess: false,
        code: 306,
        message: "닉네임은 60Byte(한글 20글자) 미만이어야 합니다."
    });

    if (!category) return res.json({isSuccess: false, code: 307, message: "카테고리를 선택해주세요."});

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            // 이메일 중복 확인
            const selectEmailQuery = `
                SELECT idx, email 
                FROM userInfo 
                WHERE email = ?;
                `;
            const selectEmailParams = [email];
            const [emailRows] = await connection.query(selectEmailQuery, selectEmailParams);

            if (emailRows.length > 0) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 308,
                    message: "이미 가입된 이메일 입니다. 뒤로가서 로그인 하거나 다른 이메일 주소를 사용하세요."
                });
            }

            //노드메일러에서 임시 토큰 받아오는거

            //메일 url을 클릭하여 계정 활성화 되면 생성 완료
            //이후 첫 로그인에서 닉네임과 카테고리를 정하는 것 까지 포함
            //일단 nodemailer 빼고 진행. 계정 활성화 여부 반영하는 쿼리로 수정도 할것

            // 닉네임 중복 확인
            const selectNicknameQuery = `
                SELECT email, nickname 
                FROM userInfo 
                WHERE nickname = ? ;
                `;
            const selectNicknameParams = [nickname];
            const [nicknameRows] = await connection.query(selectNicknameQuery, selectNicknameParams);

            if (nicknameRows.length > 0) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 309,
                    message: "이미 사용중인 닉네임입니다. 다른 닉네임을 사용하세요."
                });
            }

            await connection.beginTransaction(); // START TRANSACTION
            const hashedPassword = await crypto.createHash('sha512').update(password).digest('hex');

            const insertUserInfoQuery = `
                INSERT INTO userInfo(email, pswd, nickname, category)
                VALUES (?, ?, ?, ?);
                    `;
            const insertUserInfoParams = [email, hashedPassword, nickname, category];
            await connection.query(insertUserInfoQuery, insertUserInfoParams);
            
            await connection.beginTransaction(); // START TRANSACTION
            //계정 생성 시 기본과목 추가 .서브쿼리 안쓰고하는거 ...해야함   
            //const createSubjectQuery = `
            //INSERT INTO subjectInfo(userid, name) VALUES 
            //((select idx from userInfo Where email=?),'영어'),
            //((select idx from userInfo Where email=?),'수학');
            //    `;
            //const createSubjectParams = [email, email];
            //await connection.query(createSubjectQuery, createSubjectParams);


            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                isSuccess: true,
                code: 200,
                message: "회원가입 성공"
            });

            
            
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - SignUp Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - SignUp DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

/**
 update : 2019.11.01
 02.signIn API = 로그인
 **/
exports.signIn = async function (req, res) {
    const {
        email, password
    } = req.body;

    if (!email) return res.json({isSuccess: false, code: 301, message: "인증되지 않은 이메일 주소입니다. 수신함에서 인증링크를 클릭해주세요."});
    if (!regexEmail.test(email)) return res.json({isSuccess: false, code: 303, message: "이메일을 형식을 정확하게 입력해주세요."});

    if (!password) return res.json({isSuccess: false, code: 304, message: "비밀번호가 일치하지 않습니다. 다시 확인해주세요."});

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const selectUserInfoQuery = `
                SELECT idx, email , pswd, nickname, status 
                FROM userInfo 
                WHERE email = ? AND status='ACTIVE';
                `;

            let selectUserInfoParams = [email];

            const [userInfoRows] = await connection.query(selectUserInfoQuery, selectUserInfoParams);

            if (userInfoRows.length < 1) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 310,
                    message: "존재하지 않는 계정입니다. 가입 후 이용해주세요."
                });
            }

            const hashedPassword = await crypto.createHash('sha512').update(password).digest('hex');
            if (userInfoRows[0].pswd !== hashedPassword) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 311,
                    message: "비밀번호가 일치하지 않습니다. 다시 확인해주세요."
                });
            }

            //비활성화, 탈퇴여부 관계 없이 없는 계정으로 다룸



            //토큰 생성
            let token = await jwt.sign({
                    id: userInfoRows[0].idx,
                    email: email,
                    password: hashedPassword,
                    nickname: userInfoRows[0].nickname,
                }, // 토큰의 내용(payload)
                secret_config.jwtsecret, // 비밀 키
                {
                    expiresIn: '365d',
                    subject: 'userInfo',
                } // 유효 시간은 365일
            );



            res.json({
                result:
                {jwt: token,
                userInfo: userInfoRows[0]},
                isSuccess: true,
                code: 200,
                message: "로그인 성공"
            });

            connection.release();
        } catch (err) {
            logger.error(`App - SignIn Query error\n: ${JSON.stringify(err)}`);
            connection.release();
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - SignIn DB Connection error\n: ${JSON.stringify(err)}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};

/**
 update : 2019.09.23
 03.check API = token 검증
 **/
exports.check = async function (req, res) {
    res.json({
        isSuccess: true,
        code: 200,
        message: "검증 성공",
        info: req.verifiedToken
    })
};


//03. 이메일 찾기
exports.findEmail= async function(req, res){
    const {
        nickname
    } = req.body;

    if (nickname.length<2) return res.json({isSuccess: false, code: 305, message: "닉네임은 2글자 이상이어야 합니다."});


    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const findEmailQuery = `
                SELECT email, createdAt
                FROM userInfo 
                WHERE nickname = ? AND status='ACTIVE';
                `;

            let findEmailParams = [nickname];

            const [userInfoRows] = await connection.query(findEmailQuery, findEmailParams);

            if (userInfoRows.length < 1) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 310,
                    message: "일치하는 이메일 계정이 없습니다."
                });
            }
            //조회한 이메일에서 @앞 문자열 기준 앞 두글자 제외 다 별표표시


            //비활성화, 탈퇴여부 관계 없이 없는 계정으로 다룸

            res.json({
                userInfo: userInfoRows[0],
                isSuccess: true,
                code: 200,
                message: "이메일 조회 성공"
            });

            connection.release();
        } catch (err) {
            logger.error(`App - findEmail Query error\n: ${JSON.stringify(err)}`);
            connection.release();
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - findEmail DB Connection error\n: ${JSON.stringify(err)}`);
        return res.status(502).send(`Error: ${err.message}`);
    }

};
//존재하는 이메일인지 확인->이메일로 재설정 페이지 발송

exports.checkEmail= async function(req, res){
    const {
        email
    } = req.body;

   
    if (!email) return res.json({isSuccess: false, code: 301, message: "이메일 형식이 잘못되었습니다."});
    if (!regexEmail.test(email)) return res.json({isSuccess: false, code: 302, message: "이메일 형식이 잘못되었습니다."});

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const checkEmailQuery = `
                SELECT idx, email
                FROM userInfo 
                WHERE email = ? AND status='ACTIVE';
                `;
            let checkEmailParams = [email];

            const [userInfoRows] = await connection.query(checkEmailQuery, checkEmailParams);

            if (userInfoRows.length < 1) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 310,
                    message: "일치하는 이메일 계정이 없습니다."
                });
            }
            //이메일에 재설정 링크 쏘기

        

            //비활성화, 탈퇴여부 관계 없이 없는 계정으로 다룸

            res.json({
                isSuccess: true,
                code: 200,
                message: "비밀번호 재설정 성공"
            });

            connection.release();
        } catch (err) {
            logger.error(`App - checkEmail Query error\n: ${JSON.stringify(err)}`);
            connection.release();
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - checkEmail DB Connection error\n: ${JSON.stringify(err)}`);
        return res.status(502).send(`Error: ${err.message}`);
    }

};



//04. 비밀번호 재설정

exports.updatePswd= async function(req, res){
    const id = req.verifiedToken.id;//재설정 링크에서 토큰 확인 ??
    const {
        password//재설정 링크에서 받아온 비밀번호
    } = req.body;

    if (!password) return res.json({isSuccess: false, code: 303, message: "비밀번호는 6글자 이상이어야 합니다."});
    if (password.length < 6 ) return res.json({
        isSuccess: false,
        code: 303,
        message: "비밀번호는 6글자 이상이어야 합니다."
    });

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            
            const hashedPassword = await crypto.createHash('sha512').update(password).digest('hex');

            const updatePswdQuery = `
                UPDATE userInfo
                SET pswd=?
                WHERE idx = ? AND status='ACTIVE';
            `;
            let updatePswdParams = [hashedPassword,id];
            await connection.query(updatePswdQuery, updatePswdParams);



            //비활성화, 탈퇴여부 관계 없이 없는 계정으로 다룸

            res.json({
                isSuccess: true,
                code: 200,
                message: "비밀번호 재설정 성공"
            });

            connection.release();
        } catch (err) {
            logger.error(`App - updatePswd Query error\n: ${JSON.stringify(err)}`);
            connection.release();
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - updatePswd DB Connection error\n: ${JSON.stringify(err)}`);
        return res.status(502).send(`Error: ${err.message}`);
    }

};
//회원정보 조회
exports.getUserInfo = async function (req, res) {
    const id= req.verifiedToken.id;
    
    try {
        const connection = await pool.getConnection(async conn => conn);
        try {

            await connection.beginTransaction(); // START TRANSACTION

            const getUserInfoQuery = `

                SELECT email, nickname, message
                FROM userInfo   
                WHERE idx = ?;   
                `    ;

            const getUserInfoParams = [id];

            const[userInfoRows]= await connection.query(getUserInfoQuery, getUserInfoParams);

            await connection.commit(); // COMMIT
            connection.release();

            
            
            res.json({
                userInfo: userInfoRows[0],
                isSuccess: true,
                code: 200,
                message: "조회에 성공했습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get UserInfo Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Update DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};


//회원정보 수정
exports.updateUserInfo = async function (req, res) {
    const id= req.verifiedToken.id;

    const nickname = req.body.nickname;
    const category = req.body.category;
    const message = req.body.message;

    if (nickname.length<2) return res.json({isSuccess: false, code: 305, message: "닉네임은 2글자 이상이어야 합니다."});
    if (nickname.length > 20) return res.json({
        isSuccess: false,
        code: 306,
        message: "닉네임은 60Byte(한글 20글자) 미만이어야 합니다."
    });

    if (!category) return res.json({isSuccess: false, code: 302, message: "카테고리를 입력 해주세요."});

    if (message.length > 100) return res.json({
        isSuccess: false,
        code: 306,
        message: "메세ㅣ는 100자 이내로 입력해주세요."
    });


    try {
        const connection = await pool.getConnection(async conn => conn);
        try {

            // 닉네임 중복 확인
            const selectNicknameQuery = `
                SELECT idx, email, nickname 
                FROM userInfo 
                WHERE nickname = ?;
                `;
            const selectNicknameParams = [nickname];
            const [nicknameRows] = await connection.query(selectNicknameQuery, selectNicknameParams);

            if (nicknameRows.length > 0) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 302,
                    message: "중복된 닉네임입니다."
                });
            }

            await connection.beginTransaction(); // START TRANSACTION

            const updateUserInfoQuery = `

                UPDATE userInfo
                SET nickname = ?, category=?, message=?
                WHERE idx =? ;
                    `;
            const updateUserInfoParams = [nickname, category, message, id];
            await connection.query(updateUserInfoQuery, updateUserInfoParams);

            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                isSuccess: true,
                code: 200,
                message: "변경이 완료되었습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Edit nickname Query error\n: ${err.message}`);
            return res.status(500).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Edit nickname DB Connection error\n: ${err.message}`);
        return res.status(500).send(`Error: ${err.message}`);
    }
};


//회원탈퇴
exports.deleteUser = async function (req, res) {
    const id= req.verifiedToken.id;

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {

            await connection.beginTransaction(); // START TRANSACTION

            const updateUserInfoQuery = `

                UPDATE userInfo
                SET status = 'DELETED'
                WHERE idx =? ;
                    `;
            const updateUserInfoParams = [id];
            await connection.query(updateUserInfoQuery, updateUserInfoParams);

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
            logger.error(`App - Delete user Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Delete user DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};



