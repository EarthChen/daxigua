/**
 * 精简物理引擎 - 专为合成大西瓜优化
 * 实现圆形刚体、重力、碰撞检测和响应
 */

(function() {
'use strict';

// 环境适配导入
var PHYSICS;
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
    // Node.js / 小程序环境
    PHYSICS = require('./config').PHYSICS;
} else if (typeof window !== 'undefined' && window.GameConfig) {
    // Web 浏览器环境
    PHYSICS = window.GameConfig.PHYSICS;
} else {
    // 默认物理参数
    PHYSICS = {
        gravity: { x: 0, y: 1.2 },
        friction: 0.3,
        frictionStatic: 0.6,
        restitution: 0.05,
        frictionAir: 0.02,
        sleepThreshold: 30,
        sleepVelocityLimit: 0.5,
        positionIterations: 4,
        velocityDamping: 0.98
    };
}

/**
 * 2D 向量类
 */
class Vector {
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
class Circle {
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
        
        // 用于合成检测
        this.justCreated = true;
        this.createdAt = Date.now();
    }

    applyForce(force) {
        if (this.isStatic) return;
        this.acceleration = this.acceleration.add(force.mult(this.invMass));
    }

    update(dt, gravity) {
        if (this.isStatic || this.isRemoved) return;

        // 标记为非新创建（用于合成延迟）
        if (this.justCreated && Date.now() - this.createdAt > 100) {
            this.justCreated = false;
        }

        // 应用重力
        this.velocity = this.velocity.add(new Vector(gravity.x, gravity.y).mult(dt));
        
        // 应用加速度
        this.velocity = this.velocity.add(this.acceleration.mult(dt));
        
        // 应用空气阻力
        this.velocity = this.velocity.mult(1 - this.frictionAir);
        
        // 更新位置
        this.position = this.position.add(this.velocity.mult(dt));
        
        // 重置加速度
        this.acceleration = new Vector(0, 0);
        
        // 休眠检测
        if (this.velocity.lengthSq() < 0.1) {
            this.sleepCounter++;
            if (this.sleepCounter > PHYSICS.sleepThreshold) {
                this.isSleeping = true;
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

Circle.nextId = 0;

/**
 * 矩形刚体类（用于墙壁和地面）
 */
class Rectangle {
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

Rectangle.nextId = 1000;

/**
 * 物理世界
 */
class World {
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
        // 更新所有刚体
        for (const body of this.bodies) {
            if (!body.isSleeping) {
                body.update(dt * 60, this.gravity);
                
                // 应用速度阻尼
                if (PHYSICS.velocityDamping) {
                    body.velocity = body.velocity.mult(PHYSICS.velocityDamping);
                }
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
            if (totalMass > 0 && overlap > 0.1) {
                // 使用较小的分离比例，避免过度校正导致抖动
                const slop = 0.5;  // 允许的穿透深度
                const percent = 0.4;  // 位置修正比例
                const correctionMag = Math.max(overlap - slop, 0) / totalMass * percent;
                const correction = normal.mult(correctionMag);
                
                if (!bodyA.isStatic && !bodyA.isSleeping) {
                    bodyA.position = bodyA.position.sub(correction.mult(bodyA.invMass));
                    bodyA.wake();
                }
                if (!bodyB.isStatic && !bodyB.isSleeping) {
                    bodyB.position = bodyB.position.add(correction.mult(bodyB.invMass));
                    bodyB.wake();
                }
            }

            // 只在第一次迭代时应用冲量
            if (!applyImpulse) continue;

            // 计算相对速度
            const relVel = bodyB.velocity.sub(bodyA.velocity);
            const velAlongNormal = relVel.dot(normal);

            // 如果物体正在分离，不处理
            if (velAlongNormal > 0) continue;

            // 计算弹性系数（对于低速碰撞降低弹性）
            const speedThreshold = 2.0;
            const speed = Math.abs(velAlongNormal);
            let e = Math.min(bodyA.restitution, bodyB.restitution);
            if (speed < speedThreshold) {
                e *= speed / speedThreshold;  // 低速时减少弹性
            }

            // 计算冲量
            let j = -(1 + e) * velAlongNormal;
            j /= totalMass;

            // 应用冲量
            const impulse = normal.mult(j);
            if (!bodyA.isStatic && !bodyA.isSleeping) {
                bodyA.velocity = bodyA.velocity.sub(impulse.mult(bodyA.invMass));
            }
            if (!bodyB.isStatic && !bodyB.isSleeping) {
                bodyB.velocity = bodyB.velocity.add(impulse.mult(bodyB.invMass));
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
                        
                        // 分离
                        body.position = body.position.add(normal.mult(overlap));
                        
                        // 反弹
                        const velDotNormal = body.velocity.dot(normal);
                        if (velDotNormal < 0) {
                            const bounce = normal.mult(-velDotNormal * (1 + body.restitution));
                            body.velocity = body.velocity.add(bounce);
                            
                            // 摩擦
                            const tangent = new Vector(-normal.y, normal.x);
                            const velDotTangent = body.velocity.dot(tangent);
                            body.velocity = body.velocity.sub(tangent.mult(velDotTangent * body.friction));
                        }
                        
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

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Vector: Vector,
        Circle: Circle,
        Rectangle: Rectangle,
        World: World
    };
} else if (typeof window !== 'undefined') {
    window.Vector = Vector;
    window.Circle = Circle;
    window.Rectangle = Rectangle;
    window.World = World;
}

})(); // 关闭 IIFE
