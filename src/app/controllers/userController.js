const {pool} = require('../../../config/database');
const {logger} = require('../../../config/winston');

const jwt = require('jsonwebtoken');
const regexEmail = require('regex-email');
const crypto = require('crypto');
const secret_config = require('../../../config/secret');

const nodemailer = require('nodemailer');
const { StreamTransportOptions } = require('winston/lib/winston/transports');


/**
 update : 2019.11.01
 01.signUp API = 회원가입
 */
exports.signUp = async function (req, res) {
    const {
        email, password
    } = req.body;
 

    if (!email) return res.json({isSuccess: false, code: 301, message: "이메일 형식이 잘못되었습니다."});
    if (!regexEmail.test(email)) return res.json({isSuccess: false, code: 302, message: "이메일 형식이 잘못되었습니다."});

    if (!password) return res.json({isSuccess: false, code: 303, message: "비밀번호는 6글자 이상이어야 합니다."});
    if (password.length < 6 ) return res.json({
        isSuccess: false,
        code: 303,
        message: "비밀번호는 6글자 이상이어야 합니다."
    });

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            // 이메일 ㅇ. 인증 ㅇ
            const selectEmailQuery = `
                SELECT idx, email 
                FROM userInfo 
                WHERE email = ? and token=1 and status='ACTIVE';
                `;
            const selectEmailParams = [email];
            const [emailRows] = await connection.query(selectEmailQuery, selectEmailParams);

            
            //이메일 ㅇ. 토큰 ㄴ
            const selectEmail2Query = `
                SELECT idx, email 
                FROM userInfo 
                WHERE email = ? and token is null  and status='ACTIVE';
                `;
            const selectEmail2Params = [email];
            const [email2Rows] = await connection.query(selectEmail2Query, selectEmail2Params);

            if (emailRows.length > 0) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 308,
                    message: "이미 가입된 이메일 입니다. 뒤로가서 로그인 하거나 다른 이메일 주소를 사용하세요."
                });
            }else if (email2Rows.length > 0) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 308,
                    message: "이메일 인증을 진행해주세요."
                });
            }

            const hashedPassword = await crypto.createHash('sha512').update(password).digest('hex');
            //계정 생성
            const insertUserQuery = `
                INSERT userInfo(email, pswd) values
                (?, ?);
                `;

            let insertUserParams = [email, hashedPassword];

            await connection.query(insertUserQuery, insertUserParams);


            const smtpTransport = nodemailer.createTransport({
                service: "Naver",
                auth: {
                    user: "022499@naver.com",
                    pass: "tladnjs02/"
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            const mailOptions = {
                from: "022499@naver.com",
                to: email,
                subject: "이메일 인증을 진행해주세요!!",
                text: "http://54.168.156.34:3000/test?email=" + email
            };

            await smtpTransport.sendMail(mailOptions, (error, responses) => {
                if (error) {
                    res.send({ msg: 'err' });
                } else {
                    res.send({ msg: 'sucess' });
                }
                smtpTransport.close();
            });

            //기본과목 생성
            const insertSubjectQuery = `
                INSERT subjectInfo(userId, name) values
                ((select idx from userInfo where email=? and status='ACTIVE'),'영어'),
                ((select idx from userInfo where email=? and status='ACTIVE'),'수학');
                `;

            let insertSubjectParams = [email, email];

            await connection.query(insertSubjectQuery, insertSubjectParams);
            
            await connection.commit(); // COMMIT
            connection.release();
            return res.json({
                isSuccess: true,
                code: 200,
                message: "회원가입 성공. 메일로 인증을 진행해주세요!!"
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

//1-1. 회원가입 추가


// exports.signIn2 = async function (req, res) {
//     const {
//         email, password, nickname, category
//     } = req.body;

//     if (!email) return res.json({isSuccess: false, code: 301, message: "인증되지 않은 이메일 주소입니다. 수신함에서 인증링크를 클릭해주세요."});
//     if (!regexEmail.test(email)) return res.json({isSuccess: false, code: 303, message: "이메일을 형식을 정확하게 입력해주세요."});

//     if (!password) return res.json({isSuccess: false, code: 304, message: "비밀번호를 입력해주세요. 다시 확인해주세요."});

//     try {
//         const connection = await pool.getConnection(async conn => conn);
//         try {

//             //토큰 인증받았는지 확인하기
//             const getTokenQuery = `
//                 SELECT token
//                 FROM userInfo 
//                 WHERE email = ?  and status='ACTIVE';
//             `;
//             const getTokenParams = [email];
//             const [getTokenRows] = await connection.query(getTokenQuery, getTokenParams);

//             //받은 이메일 정보에 닉네임이 없다면 닉네임과 카테고리를 삽입해주세요
//             const getNicknameQuery = `
//                 SELECT nickname 
//                 FROM userInfo 
//                 WHERE email = ?  and status='ACTIVE';
//             `;
//             const getNicknameParams = [email];
//             const [getNicknameRows] = await connection.query(getNicknameQuery, getNicknameParams);

//             // 닉네임 중복 확인
//             const selectNicknameQuery = `
//                 SELECT email, nickname 
//                 FROM userInfo 
//                 WHERE nickname = ?  and status='ACTIVE';
//                 `;
//             const selectNicknameParams = [nickname];
//             const [nicknameRows] = await connection.query(selectNicknameQuery, selectNicknameParams);

//             const insertNicknameQuery = `
//             update userInfo
//             set nickname=?, category=?
//             where email=?  and status='ACTIVE';
//         `;
//             const insertNicknameParams = [nickname, category, email];

//             if (getTokenRows.length < 1) {
//                 connection.release();
//                 return res.json({
//                     isSuccess: false,
//                     code: 309,
//                     message: "인증을 진행해주세요."
//                 });
//             } else if (getNicknameRows.length < 1) {
//                 if (nicknameRows.length > 0) {
//                     connection.release();
//                     return res.json({
//                         isSuccess: false,
//                         code: 309,
//                         message: "이미 사용중인 닉네임입니다. 다른 닉네임을 사용하세요."
//                     });
//                 }
//                 else if (!nickname) {
//                     return res.json({ isSuccess: false, code: 306, message: "닉네임을 입력 해주세요." });
//                 } else if (!category) {
//                     return res.json({ isSuccess: false, code: 306, message: "카테고리를 입력 해주세요." });
//                 } else {
//                     await connection.query(insertNicknameQuery, insertNicknameParams);
//                     connection.release();
//                     res.json({
//                         isSuccess: true,
//                         code: 200,
//                         message: "닉네임, 카테고리 설정 성공"
//                     });
//                 }
//             }
//             connection.release();
//         } catch (err) {
//             logger.error(`App - SignIn Query error\n: ${JSON.stringify(err)}`);
//             connection.release();
//             return res.status(501).send(`Error: ${err.message}`);
//         }
//     } catch (err) {
//         logger.error(`App - SignIn DB Connection error\n: ${JSON.stringify(err)}`);
//         return res.status(502).send(`Error: ${err.message}`);
//     }
// };

exports.signIn3 = async function (req, res) {
    const {
        email, password, nickname, category
    } = req.body;

    if (!email) return res.json({isSuccess: false, code: 301, message: "인증되지 않은 이메일 주소입니다. 수신함에서 인증링크를 클릭해주세요."});
    if (!regexEmail.test(email)) return res.json({isSuccess: false, code: 302, message: "이메일을 형식을 정확하게 입력해주세요."});

    if (!password) return res.json({isSuccess: false, code: 303, message: "비밀번호를 입력해주세요. 다시 확인해주세요."});

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {

            //토큰 인증받았는지 확인하기
            const getTokenQuery = `
                SELECT token
                FROM userInfo 
                WHERE email = ?  and status='ACTIVE';
            `;
            const getTokenParams = [email];
            const [getTokenRows] = await connection.query(getTokenQuery, getTokenParams);

            const insertNicknameQuery = `
            update userInfo
            set nickname=?, category=?
            where email=?  and status='ACTIVE';
        `;
            const insertNicknameParams = [nickname, category, email];
            
            if (!getTokenRows.token ) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 304,
                    message: "이메일로 인증을 진행해주세요."
                });
            } else {
                await connection.query(insertNicknameQuery, insertNicknameParams);
                connection.release();
                res.json({
                    isSuccess: true,
                    code: 200,
                    message: "닉네임, 카테고리 설정 성공"
                });
            }

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
 update : 2019.11.01
 02.signIn API = 로그인
 **/

exports.signIn = async function (req, res) {
    const {
        email, password
    } = req.body;

    if (!email) return res.json({isSuccess: false, code: 301, message: "이메일을 입력해주세요."});
    if (!regexEmail.test(email)) return res.json({isSuccess: false, code: 302, message: "이메일을 형식을 정확하게 입력해주세요."});

    if (!password) return res.json({isSuccess: false, code: 304, message: "비밀번호를 입력해주세요. 다시 확인해주세요."});

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
            
            const hashedPassword = await crypto.createHash('sha512').update(password).digest('hex');
            
            //토큰 인증받았는지 확인하기
            const getTokenQuery= `
                SELECT token
                FROM userInfo 
                WHERE email = ?  and status='ACTIVE';
            `;
            const getTokenParams=[email];
            const [getTokenRows] = await connection.query(getTokenQuery, getTokenParams);

            if (userInfoRows.length < 1) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 310,
                    message: "존재하지 않는 계정입니다. 가입 후 이용해주세요."
                });
            }else if (userInfoRows[0].pswd !== hashedPassword) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 311,
                    message: "비밀번호가 일치하지 않습니다. 다시 확인해주세요."
                });
            }else if (getTokenRows.length < 1) {
                connection.release();
                return res.json({
                    isSuccess: false,
                    code: 309,
                    message: "인증을 진행해주세요."
                });
            }

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
 06.check API = token 검증
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
    const nickname = req.query.nickname;

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
            }else{
                connection.release();
                return res.json({

                    userInfo: userInfoRows[0],
                    isSuccess: true,
                    code: 200,
                    message: "이메일 조회 성공"
                });
            }
            //조회한 이메일에서 @앞 문자열 기준 앞 두글자 제외 다 별표표시
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
//5-1이메일 존재 확인
exports.checkEmail1= async function(req, res){
    const email=req.body.email;
    console.log(email);
   
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
            }else{
                connection.release();
                return res.json({
                    isSuccess: true,
                    code: 200,
                    message: "이메일로 가입한 계정이 있습니다. 재설정 화면으로 넘어갑니다"
                });
            }
        } catch (err) {
            logger.error(`App - checkEmail1 Query error\n: ${JSON.stringify(err)}`);
            connection.release();
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - checkEmail2 DB Connection error\n: ${JSON.stringify(err)}`);
        return res.status(502).send(`Error: ${err.message}`);
    }

};


//05-2. 받은 이메일로 재설정 페이지 발송

exports.checkEmail2= async function(req, res){
    const email=req.body.email;
   
    if (!email) return res.json({isSuccess: false, code: 301, message: "이메일 형식이 잘못되었습니다."});
    if (!regexEmail.test(email)) return res.json({isSuccess: false, code: 302, message: "이메일 형식이 잘못되었습니다."});

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const smtpTransport = nodemailer.createTransport({
                service: "Naver",
                auth: {
                    user: "022499@naver.com",
                    pass: "tladnjs02/"
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            const mailOptions = {
                from: "022499@naver.com",
                to: email,
                subject: "비밀번호 재설정 링크입니다!!",
                text: "http://54.168.156.34:3000/findpswd?email=" + email
            };

            await smtpTransport.sendMail(mailOptions, (error, responses) => {
                if (error) {
                    res.send({
                        isSuccess: false,
                        code: 311,
                        message: "비밀번호 재설정 링크 전송 실패"
                     });
                } else {
                    res.send({ 
                        isSuccess: true,
                        code: 200,
                        message: "비밀번호 재설정 링크 전송 성공" });
                }
                smtpTransport.close();
            });
    
            //비활성화, 탈퇴여부 관계 없이 없는 계정으로 다룸
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
    const email = req.query.email;
    const {
        password//재설정 링크에서 받아온 비밀번호
    } = req.body;

    if (!password) return res.json({isSuccess: false, code: 302, message: "비밀번호는 6글자 이상이어야 합니다."});
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
                SET pswd=?, updatedAt=current_timestamp()
                WHERE email = ? AND status='ACTIVE';
            `;
            let updatePswdParams = [hashedPassword,email];
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
            const getUserInfoQuery = `

                SELECT email, nickname, message
                FROM userInfo   
                WHERE idx = ? and status='ACTIVE';   
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
            connection.release();
            logger.error(`App - Get UserInfo Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get UserInfo DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};


//회원정보 수정
exports.updateUserInfo = async function (req, res) {
    const id= req.verifiedToken.id;

    const nickname = req.body.nickname;
    const category = req.body.category;
    const message = req.body.message;

    if (nickname.length<2) return res.json({isSuccess: false, code: 301, message: "닉네임은 2글자 이상이어야 합니다."});
    if (nickname.length > 20) return res.json({
        isSuccess: false,
        code: 302,
        message: "닉네임은 60Byte(한글 20글자) 미만이어야 합니다."
    });

    if (!category) return res.json({isSuccess: false, code: 303, message: "카테고리를 입력 해주세요."});

    if (message.length > 100) return res.json({
        isSuccess: false,
        code: 304,
        message: "메세지는 100자 이내로 입력해주세요."
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
                    code: 305,
                    message: "중복된 닉네임입니다."
                });
            }

            await connection.beginTransaction(); // START TRANSACTION

            const updateUserInfoQuery = `

                UPDATE userInfo
                SET nickname = ?, category=?, message=? , updatedAt=current_timestamp()
                WHERE idx =? and status='ACTIVE';
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

            const updateUserInfoQuery = `

                UPDATE userInfo
                SET status = 'DELETED' , updatedAt=current_timestamp()
                WHERE idx =? and status='ACTIVE' ;
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



//27. 공지사항 조회

exports.noticeList = async function (req, res) {

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {

            const getNoticeListQuery = `

                select title, date(createdAt)
                from notice
                where status='ACTIVE';
                    `;
            
            const [list] = await connection.query(getNoticeListQuery);

            await connection.commit(); // COMMIT
            connection.release();

            return res.json({
                list:list,
                isSuccess: true,
                code: 200,
                message: "공지사항 목록 조회가 완료되었습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get Notice List Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get Notice List DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};
//28. 공지사항 상세 조회

exports.noticeInfo = async function (req, res) {
    const nid= req.query.noticeId
    if (!nid) return res.json({isSuccess: false, code: 301, message: "공지사항 인덱스를 입력해주세요."});

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {

            const getNoticeInfoQuery = `

                select title, content
                from notice
                where idx=?
                    `;
            
            const list = await connection.query(getNoticeInfoQuery, nid);

            await connection.commit(); // COMMIT
            connection.release();

            return res.json({
                info:list[0],
                isSuccess: true,
                code: 200,
                message: "공지사항 상세 조회가 완료되었습니다"
            });
        } catch (err) {
            await connection.rollback(); // ROLLBACK
            connection.release();
            logger.error(`App - Get Notice List Query error\n: ${err.message}`);
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - Get Notice List DB Connection error\n: ${err.message}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};


//토큰인증 api

exports.token = async function (req, res) {
    const email =req.query.email;
    if (!email) return res.json({isSuccess: false, code: 301, message: "이메일을 입력해주세요"});
    

    try {
        const connection = await pool.getConnection(async conn => conn);
        try {
            const insertTokenQuery = `
                update userInfo 
                set token=1
                where email=?
                `;

            let insertTokenParams = [email];

            const Rows= await connection.query(insertTokenQuery, insertTokenParams);
            if (!Rows) {
                return res.json({
                    isSuccess: false,
                    code: 302,
                    message: "이메일 인증에 실패했습니다"
                });
            }else {
                connection.release();
                return res.json({
                    isSuccess: true,
                    code: 200,
                    message: "이메일인증에 성공했습니다 . 어플로 돌아가서 로그인해주세요~!!"
                });
            }
        
        } catch (err) {
            logger.error(`App - token Query error\n: ${JSON.stringify(err)}`);
            connection.release();
            return res.status(501).send(`Error: ${err.message}`);
        }
    } catch (err) {
        logger.error(`App - token DB Connection error\n: ${JSON.stringify(err)}`);
        return res.status(502).send(`Error: ${err.message}`);
    }
};


