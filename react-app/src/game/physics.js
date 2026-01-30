/**
 * 精简物理引擎 - 专为合成大西瓜优化
 * 实现圆形刚体、重力、碰撞检测和响应
 */

import { PHYSICS } from './config';

/**
 * 2D 向量类
 */
export class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    sub(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    mult(s) {
        return new Vector(this.x * s, this.y * s);
    }

    div(s) {
        return s !== 0 ? new Vector(this.x / s, this.y / s) : new Vector();
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }

    normalize() {
        const len = this.length();
        return len > 0 ? this.div(len) : new Vector();
    }

    clone() {
        return new Vector(this.x, this.y);
    }
}

/**
 * 圆形刚体类
 */
export class Circle {
    static nextId = 0;
    
    constructor(x, y, radius, options = {}) {
        this.id = Circle.nextId++;
        this.position = new Vector(x, y);
        this.velocity = new Vector(0, 0);
        this.acceleration = new Vector(0, 0);
        this.radius = radius;
        
        // 物理属性
        this.mass = options.mass || (Math.PI * radius * radius * 0.01);
        this.invMass = options.isStatic ? 0 : 1 / this.mass;
        this.restitution = options.restitution !== undefined ? options.restitution : PHYSICS.restitution;
        this.friction = options.friction !== undefined ? options.friction : PHYSICS.friction;
        this.frictionAir = options.frictionAir !== undefined ? options.frictionAir : PHYSICS.frictionAir;
        
        // 状态
        this.isStatic = options.isStatic || false;
        this.isSleeping = false;
        this.sleepCounter = 0;
        this.label = options.label || 'circle';
        this.fruitLevel = options.fruitLevel;
        this.isRemoved = false;
        
        // 用于合成检测和特殊属性
        this.justCreated = true;
        this.createdAt = options.createdAt || Date.now();
        
        // 特殊水果属性
        this.isMysteryBox = options.isMysteryBox || false;
        this.mysteryState = options.mysteryState || null;
        this.iceState = options.iceState || null;
        this.isBomb = options.isBomb || false;
        this.frozen = options.frozen || false;
    }

    applyForce(force) {
        if (this.isStatic) return;
        this.acceleration = this.acceleration.add(force.mult(this.invMass));
    }

    applyImpulse(impulse) {
        if (this.isStatic) return;
        // 支持普通对象和 Vector
        const impulseVec = impulse instanceof Vector 
            ? impulse 
            : new Vector(impulse.x || 0, impulse.y || 0);
        this.velocity = this.velocity.add(impulseVec.mult(this.invMass));
        this.wake();
    }

    update(dt, gravity) {
        if (this.isStatic || this.isRemoved) return;

        // 标记为非新创建（用于合成延迟）
        if (this.justCreated && Date.now() - this.createdAt > 100) {
            this.justCreated = false;
        }

        // 应用重力（平滑加速）
        const gravityForce = new Vector(gravity.x, gravity.y).mult(dt);
        this.velocity = this.velocity.add(gravityForce);
        
        // 应用加速度
        this.velocity = this.velocity.add(this.acceleration.mult(dt));
        
        // 应用空气阻力（轻微阻尼）
        const airResistance = 1 - this.frictionAir;
        this.velocity = this.velocity.mult(airResistance);
        
        // 限制最大速度，防止穿透
        const maxSpeed = 15;
        const speed = this.velocity.length();
        if (speed > maxSpeed) {
            this.velocity = this.velocity.mult(maxSpeed / speed);
        }
        
        // 更新位置（使用半隐式欧拉法更稳定）
        this.position = this.position.add(this.velocity.mult(dt));
        
        // 重置加速度
        this.acceleration = new Vector(0, 0);
        
        // 休眠检测
        const sleepThreshold = PHYSICS.sleepVelocityLimit || 0.3;
        if (this.velocity.lengthSq() < sleepThreshold * sleepThreshold) {
            this.sleepCounter++;
            if (this.sleepCounter > PHYSICS.sleepThreshold) {
                this.isSleeping = true;
                // 完全停止
                this.velocity = new Vector(0, 0);
            }
        } else {
            this.sleepCounter = 0;
            this.isSleeping = false;
        }
    }

    wake() {
        this.isSleeping = false;
        this.sleepCounter = 0;
    }
}

/**
 * 矩形刚体类（用于墙壁和地面）
 */
export class Rectangle {
    static nextId = 1000;
    
    constructor(x, y, width, height, options = {}) {
        this.id = Rectangle.nextId++;
        this.position = new Vector(x, y);
        this.width = width;
        this.height = height;
        this.isStatic = true;
        this.label = options.label || 'rectangle';
        this.isRemoved = false;
    }
}

/**
 * 物理世界
 */
export class World {
    constructor(options = {}) {
        this.gravity = options.gravity || { x: PHYSICS.gravity.x, y: PHYSICS.gravity.y };
        this.bodies = [];
        this.walls = [];
        this.collisionPairs = [];
    }

    add(body) {
        if (body instanceof Circle) {
            this.bodies.push(body);
        } else if (body instanceof Rectangle) {
            this.walls.push(body);
        }
    }

    remove(body) {
        body.isRemoved = true;
        if (body instanceof Circle) {
            const index = this.bodies.indexOf(body);
            if (index > -1) {
                this.bodies.splice(index, 1);
            }
        }
    }

    clear() {
        this.bodies = [];
        this.collisionPairs = [];
    }

    update(dt = 1/60) {
        // 更新所有刚体（使用固定的时间步长）
        const fixedDt = 1.0;  // 固定时间步长
        for (const body of this.bodies) {
            if (!body.isSleeping) {
                body.update(fixedDt, this.gravity);
                
                // 应用速度阻尼
                const damping = PHYSICS.velocityDamping || 0.99;
                body.velocity = body.velocity.mult(damping);
            }
        }

        // 多次迭代碰撞解决，减少抖动
        const iterations = PHYSICS.positionIterations || 4;
        for (let i = 0; i < iterations; i++) {
            // 碰撞检测和响应
            this.collisionPairs = [];
            this.detectCollisions();
            this.resolveCollisions(i === 0);  // 只在第一次迭代时应用冲量
            
            // 墙壁碰撞
            this.handleWallCollisions();
        }

        // 检查休眠状态
        this.updateSleepStates();
    }

    updateSleepStates() {
        const sleepVelLimit = PHYSICS.sleepVelocityLimit || 0.5;
        const sleepThreshold = PHYSICS.sleepThreshold || 30;
        
        for (const body of this.bodies) {
            if (body.isStatic || body.isRemoved) continue;
            
            const velSq = body.velocity.lengthSq();
            if (velSq < sleepVelLimit * sleepVelLimit) {
                body.sleepCounter = (body.sleepCounter || 0) + 1;
                if (body.sleepCounter >= sleepThreshold) {
                    body.isSleeping = true;
                    body.velocity = new Vector(0, 0);
                }
            } else {
                body.sleepCounter = 0;
                body.isSleeping = false;
            }
        }
    }

    detectCollisions() {
        const n = this.bodies.length;
        for (let i = 0; i < n; i++) {
            const a = this.bodies[i];
            if (a.isRemoved) continue;
            
            for (let j = i + 1; j < n; j++) {
                const b = this.bodies[j];
                if (b.isRemoved) continue;

                // 圆形碰撞检测
                const dx = b.position.x - a.position.x;
                const dy = b.position.y - a.position.y;
                const distSq = dx * dx + dy * dy;
                const minDist = a.radius + b.radius;

                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    const overlap = minDist - dist;
                    const normal = dist > 0 
                        ? new Vector(dx / dist, dy / dist) 
                        : new Vector(1, 0);

                    this.collisionPairs.push({
                        bodyA: a,
                        bodyB: b,
                        normal: normal,
                        overlap: overlap,
                        contactPoint: a.position.add(normal.mult(a.radius))
                    });
                }
            }
        }
    }

    resolveCollisions(applyImpulse = true) {
        for (const pair of this.collisionPairs) {
            const { bodyA, bodyB, normal, overlap } = pair;

            if (bodyA.isRemoved || bodyB.isRemoved) continue;

            // 分离重叠的物体（使用更平滑的分离）
            const totalMass = bodyA.invMass + bodyB.invMass;
            if (totalMass > 0 && overlap > 0.05) {
                // 使用配置的参数
                const slop = PHYSICS.collisionSlop || 0.3;
                const percent = PHYSICS.collisionPercent || 0.5;
                const correctionMag = Math.max(overlap - slop, 0) / totalMass * percent;
                const correction = normal.mult(correctionMag);
                
                if (!bodyA.isStatic) {
                    bodyA.position = bodyA.position.sub(correction.mult(bodyA.invMass));
                    if (bodyA.isSleeping) bodyA.wake();
                }
                if (!bodyB.isStatic) {
                    bodyB.position = bodyB.position.add(correction.mult(bodyB.invMass));
                    if (bodyB.isSleeping) bodyB.wake();
                }
            }

            // 只在第一次迭代时应用冲量
            if (!applyImpulse) continue;

            // 计算相对速度
            const relVel = bodyB.velocity.sub(bodyA.velocity);
            const velAlongNormal = relVel.dot(normal);

            // 如果物体正在分离，不处理
            if (velAlongNormal > 0) continue;

            // 计算弹性系数
            // 使用平均值而非最小值，让弹性更明显
            const speed = Math.abs(velAlongNormal);
            let e = (bodyA.restitution + bodyB.restitution) / 2;
            
            // 只在极低速时降低弹性
            const speedThreshold = 0.8;
            if (speed < speedThreshold) {
                e *= 0.3 + 0.7 * (speed / speedThreshold);
            }
            
            // 增加最小弹性，确保有回弹感
            e = Math.max(e, 0.08);

            // 计算冲量
            let j = -(1 + e) * velAlongNormal;
            j /= totalMass;

            // 应用冲量，增加一点额外的弹跳
            const impulse = normal.mult(j * 1.1);
            if (!bodyA.isStatic) {
                bodyA.velocity = bodyA.velocity.sub(impulse.mult(bodyA.invMass));
                if (bodyA.isSleeping) bodyA.wake();
            }
            if (!bodyB.isStatic) {
                bodyB.velocity = bodyB.velocity.add(impulse.mult(bodyB.invMass));
                if (bodyB.isSleeping) bodyB.wake();
            }

            // 应用摩擦力
            const friction = Math.sqrt(bodyA.friction * bodyB.friction);
            const tangent = relVel.sub(normal.mult(velAlongNormal)).normalize();
            let jt = -relVel.dot(tangent);
            jt /= totalMass;

            // 库仑摩擦定律
            const frictionImpulse = Math.abs(jt) < j * friction
                ? tangent.mult(jt)
                : tangent.mult(-j * friction);

            if (!bodyA.isStatic && !bodyA.isSleeping) {
                bodyA.velocity = bodyA.velocity.sub(frictionImpulse.mult(bodyA.invMass));
            }
            if (!bodyB.isStatic && !bodyB.isSleeping) {
                bodyB.velocity = bodyB.velocity.add(frictionImpulse.mult(bodyB.invMass));
            }
        }
    }

    handleWallCollisions() {
        for (const body of this.bodies) {
            if (body.isStatic || body.isRemoved) continue;

            for (const wall of this.walls) {
                // 计算墙壁边界
                const left = wall.position.x - wall.width / 2;
                const right = wall.position.x + wall.width / 2;
                const top = wall.position.y - wall.height / 2;
                const bottom = wall.position.y + wall.height / 2;

                // 找到最近点
                const closestX = Math.max(left, Math.min(body.position.x, right));
                const closestY = Math.max(top, Math.min(body.position.y, bottom));

                // 计算距离
                const dx = body.position.x - closestX;
                const dy = body.position.y - closestY;
                const distSq = dx * dx + dy * dy;

                if (distSq < body.radius * body.radius) {
                    const dist = Math.sqrt(distSq);
                    const overlap = body.radius - dist;

                    if (dist > 0) {
                        const normal = new Vector(dx / dist, dy / dist);
                        
                        // 分离（确保完全分开）
                        body.position = body.position.add(normal.mult(overlap + 0.5));
                        
                        // 反弹
                        const velDotNormal = body.velocity.dot(normal);
                        if (velDotNormal < 0) {
                            // 增加墙壁弹性
                            const wallRestitution = 0.3;
                            const effectiveRestitution = Math.max(body.restitution, wallRestitution);
                            const bounceStrength = -velDotNormal * (1 + effectiveRestitution);
                            const bounce = normal.mult(bounceStrength);
                            body.velocity = body.velocity.add(bounce);
                            
                            // 摩擦
                            const tangent = new Vector(-normal.y, normal.x);
                            const velDotTangent = body.velocity.dot(tangent);
                            body.velocity = body.velocity.sub(tangent.mult(velDotTangent * body.friction * 0.8));
                        }
                        
                        body.wake();
                    } else {
                        // 完全重叠，强制推出
                        const pushDir = wall.label === 'ground' ? new Vector(0, -1) :
                                       wall.label === 'leftWall' ? new Vector(1, 0) :
                                       new Vector(-1, 0);
                        body.position = body.position.add(pushDir.mult(body.radius + 1));
                        body.wake();
                    }
                }
            }
        }
    }

    getCollisionPairs() {
        return this.collisionPairs;
    }
}
