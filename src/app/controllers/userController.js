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
    if (!regexEmail.test(email)) return res.json({isSuccess: false, code: 302, message: "이메일 형식이 잘못되었습니다."});

    if (!password) return res.json({isSuccess: false, code: 303, message: "비밀번호는 6글자 이상이어야 합니다."});
    if (password.length < 6 ) return res.json({
        isSuccess: false,
        code: 304,
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

            //메일 url을 클릭하여 계정 활성화 되면 생성 완료
            //이후 첫 로그인에서 닉네임과 카테고리를 정하는 것 까지 포함
            //일단 nodemailer 빼고 진행. 계정 활성화 여부 반영하는 쿼리로 수정도 할것

            // 닉네임 중복 확인
            const selectNicknameQuery = `
                SELECT email, nickname 
                FROM UserInfo 
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
                INSERT INTO userInfo(email, pswd)
                VALUES (?, ?);
                    `;
            const insertUserInfoParams = [email, hashedPassword];
            await connection.query(insertUserInfoQuery, insertUserInfoParams);

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
                SELECT id, email , pswd, nickname, status 
                FROM UserInfo 
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
                    id: userInfoRows[0].id,
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
                userInfo: userInfoRows[0],
                jwt: token,
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
exports.findemail= async function(req, res){
    const {
        nickname
    } = req.body;

    if (nickname.length<2) return res.json({isSuccess: false, code: 305, message: "닉네임은 2글자 이상이어야 합니다."});


    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const findEmailQuery = `
                SELECT email, iscreated
                FROM UserInfo 
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

//04. 비밀번호 재설정

exports.findemail= async function(req, res){
    const {
        email, password//재설정할 비밀번호
    } = req.body;

   
    if (!email) return res.json({isSuccess: false, code: 301, message: "이메일 형식이 잘못되었습니다."});
    if (!regexEmail.test(email)) return res.json({isSuccess: false, code: 302, message: "이메일 형식이 잘못되었습니다."});


    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const findPswdQuery = `
                SELECT id, 
                FROM UserInfo 
                WHERE email = ? AND status='ACTIVE';
                `;
            let findPswdParams = [email];

            const [userInfoRows] = await connection.query(findPswdQuery, findPswdParams);

            if (userInfoRows.length < 1) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 310,
                    message: "일치하는 이메일 계정이 없습니다."
                });
            }

            //생성한 토큰 이메일에서 받아온 뒤 입력받은 비밀번호로 재설정
            //순서랑 토큰 헷갈리지 말기...물어볼 것
            //토큰 확인하는거 필요 !!!

            const resetPswdQuery = `
                UPDATE pswd
                FROM UserInfo 
                WHERE email = ? AND status='ACTIVE';
            `;
            let resetPswdParams = [password];
            const [userInfoRows] = await connection.query(resetPswdQuery, resetPswdParams);



            //비활성화, 탈퇴여부 관계 없이 없는 계정으로 다룸

            res.json({
                isSuccess: true,
                code: 200,
                message: "비밀번호 재설정 성공"
            });

            connection.release();
        } catch (err) {
            logger.error(`App - findPswd Query error\n: ${JSON.stringify(err)}`);
            connection.release();
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - findPswd DB Connection error\n: ${JSON.stringify(err)}`);
        return res.status(502).send(`Error: ${err.message}`);
    }

};
