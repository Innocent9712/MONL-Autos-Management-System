import { db } from "../../src/utils/prismaClient";
import { Request, Response, NextFunction } from "express";
import { DecodedToken, generateAccessToken, verifyToken } from "../utils/general";
import jwt, { JwtPayload } from 'jsonwebtoken'


class Auth {
    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            const user = await db.user.findUnique({ where: { email } })
            if (!user) {
                res.status(401).send('Invalid credentials');
            } else {
                const encodedpassword = Buffer.from(password, 'utf8').toString("base64");
                if (user.password === encodedpassword) {
                    const token = generateAccessToken(user.email)
                    res.status(200).send({
                        message: 'Login successful',
                        data: {
                            id: user.id,
                            email: user.email,
                            access_token: token
                        }
                    })
                } else {
                    res.status(401).send('Invalid credentials');
                }
            }
        } catch (error) {
            console.log("Missing information", error);
            res.status(400).send('Bad request')
        }    
    }

    // async logout(req: Request, res: Response) {
    //     try {
    //         const cookies = await parseCookies(req);
    //         const {token} = cookies

    //         let bearer
            
    //         const authHeader = req.headers['authorization'];
            
    //         if (authHeader && authHeader.startsWith('Bearer ')) {
    //           bearer = authHeader.split(' ')[1];
    //         }
            
    //         const tokenValue = token || bearer

    //         if (tokenValue) {
    //             await redisClient.del(tokenValue);
    //             console.log(`logged out`);
    //             res.status(200).clearCookie('token').send('Logged out');
    //         } else {
    //             res.status(401).send('Unauthorized');
    //         }
    //     } catch (error) {
    //         console.log(error);
    //         res.status(500).send('Internal server error');
    //     }
    // }

    async auth(req: Request, res: Response, next: NextFunction) {
        try {
           
            const authHeader = req.headers['authorization'];

            const bearer = (authHeader?.split(' ')[1])?.replace(/^(['"])(.*?)\1$/, '$2');

            if (bearer) {
                const decodedToken: DecodedToken = verifyToken(bearer);

                if (decodedToken.error) {
                    const err: any = decodedToken.error
                    if (err instanceof jwt.JsonWebTokenError) {
                        return res.status(401).json({ error: 'Invalid token' });
                      } else if (err instanceof jwt.TokenExpiredError) {
                        return res.status(401).json({ error: 'Token has expired' });
                      } else if (err instanceof jwt.NotBeforeError) {
                        return res.status(401).json({ error: 'Token cannot be used yet' });
                      }
                      return res.status(500).json({ error: 'Something went wrong' });
                    
                } else {
                    const { email } = decodedToken?.data?.data ?? { email: null };
                    if (email) {
                        const user = await db.user.findUnique({ where: { email } });
                        
                        if (user) {
                            req.body = {...req.body, detokenizedEmail: email, detokenizedRole: user.roleID};
                            next();
                        }
                    } else {
                        res.status(401).send('Unauthorized');
                    }
                }
            } else {
                res.status(401).send('Unauthorized gg');
            }
        } catch (error) {
            console.log(error);
            res.status(500).send('Internal Server Error');
        }
    }
}

const auth = new Auth();
export default auth;