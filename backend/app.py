from flask import Flask, request, jsonify, send_from_directory # type: ignore
from flask_sqlalchemy import SQLAlchemy # type: ignore
from flask_cors import CORS # type: ignore
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity # type: ignore
from datetime import datetime
import random
import os
from werkzeug.utils import secure_filename # type: ignore

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# 配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///thesis.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  # 在生产环境中应该使用环境变量
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max-limit

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# 数据模型
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    is_expert = db.Column(db.Boolean, default=False)
    reviews = db.relationship('Review', backref='reviewer', lazy=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Thesis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending')
    file_path = db.Column(db.String(200))
    reviews = db.relationship('Review', backref='thesis', lazy=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    author = db.relationship('User', backref='theses')

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    thesis_id = db.Column(db.Integer, db.ForeignKey('thesis.id'), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    score = db.Column(db.Integer)
    comments = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# 工具函数
def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 添加根路由
@app.route('/')
def index():
    return jsonify({
        'status': 'running',
        'message': '论文评定系统API服务器正在运行',
        'endpoints': {
            'test': '/api/test',
            'register': '/api/register',
            'login': '/api/login',
            'thesis': '/api/thesis'
        }
    })

# 路由
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': '用户名已存在'}), 400
    
    if data['password'] != data.get('confirmPassword'):
        return jsonify({'error': '两次输入的密码不一致'}), 400
    
    user = User(
        username=data['username'],
        password=data['password'],  # 实际应用中应该加密
        is_expert=data.get('is_expert', False)
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': '注册成功'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    if user and user.password == data['password']:  # 实际应用中应该验证加密密码
        access_token = create_access_token(identity=user.id)
        return jsonify({
            'token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'is_expert': user.is_expert
            }
        }), 200
    return jsonify({'error': '用户名或密码错误'}), 401

@app.route('/api/thesis', methods=['POST'])
@jwt_required()
def create_thesis():
    current_user_id = get_jwt_identity()
    data = request.form
    
    thesis = Thesis(
        title=data['title'],
        content=data['content'],
        author_id=current_user_id
    )
    
    if 'file' in request.files:
        file = request.files['file']
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            thesis.file_path = filename
    
    db.session.add(thesis)
    db.session.commit()
    return jsonify({'message': '论文创建成功', 'id': thesis.id}), 201

@app.route('/api/thesis', methods=['GET'])
@jwt_required()
def get_thesis_list():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    query = Thesis.query
    if user.is_expert:
        # 专家只能看到分配给他们的论文
        query = query.join(Review).filter(Review.reviewer_id == current_user_id)
    
    # 搜索功能
    search = request.args.get('search', '')
    if search:
        query = query.filter(Thesis.title.ilike(f'%{search}%'))
    
    # 状态筛选
    status = request.args.get('status', 'all')
    if status != 'all':
        query = query.filter(Thesis.status == status)
    
    theses = query.order_by(Thesis.created_at.desc()).all()
    
    return jsonify([{
        'id': thesis.id,
        'title': thesis.title,
        'content': thesis.content,
        'status': thesis.status,
        'file_path': thesis.file_path,
        'created_at': thesis.created_at.isoformat(),
        'author': thesis.author.username,
        'average_score': sum(r.score for r in thesis.reviews) / len(thesis.reviews) if thesis.reviews else 0
    } for thesis in theses])

@app.route('/api/thesis/<int:thesis_id>', methods=['GET'])
@jwt_required()
def get_thesis(thesis_id):
    thesis = Thesis.query.get_or_404(thesis_id)
    reviews = Review.query.filter_by(thesis_id=thesis_id).all()
    
    avg_score = sum(r.score for r in reviews) / len(reviews) if reviews else 0
    
    return jsonify({
        'id': thesis.id,
        'title': thesis.title,
        'content': thesis.content,
        'status': thesis.status,
        'file_path': thesis.file_path,
        'created_at': thesis.created_at.isoformat(),
        'author': thesis.author.username,
        'average_score': avg_score,
        'reviews': [{
            'score': r.score,
            'comments': r.comments,
            'reviewer': r.reviewer.username,
            'created_at': r.created_at.isoformat()
        } for r in reviews]
    })

@app.route('/api/thesis/<int:thesis_id>/review', methods=['POST'])
@jwt_required()
def submit_review(thesis_id):
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # 检查是否已经评审过
    existing_review = Review.query.filter_by(
        thesis_id=thesis_id,
        reviewer_id=current_user_id
    ).first()
    
    if existing_review:
        return jsonify({'error': '您已经评审过这篇论文'}), 400
    
    review = Review(
        thesis_id=thesis_id,
        reviewer_id=current_user_id,
        score=data['score'],
        comments=data.get('comments', '')
    )
    db.session.add(review)
    
    # 检查是否所有评审都已完成
    thesis = Thesis.query.get(thesis_id)
    if len(thesis.reviews) >= 2:  # 已经有2个评审，这是第3个
        thesis.status = 'completed'
    
    db.session.commit()
    return jsonify({'message': '评审提交成功'}), 201

@app.route('/api/assign-thesis', methods=['POST'])
@jwt_required()
def assign_thesis():
    # 获取所有专家
    experts = User.query.filter_by(is_expert=True).all()
    # 获取所有待评审的论文
    pending_thesis = Thesis.query.filter_by(status='pending').all()
    
    for thesis in pending_thesis:
        # 为每篇论文分配3位专家
        assigned_experts = random.sample(experts, min(3, len(experts)))
        for expert in assigned_experts:
            # 检查专家是否已经评审了太多论文
            expert_reviews = Review.query.filter_by(reviewer_id=expert.id).count()
            if expert_reviews < 10:  # 确保每个专家最多评审10篇论文
                review = Review(
                    thesis_id=thesis.id,
                    reviewer_id=expert.id
                )
                db.session.add(review)
    
    db.session.commit()
    return jsonify({'message': '论文分配完成'}), 200

@app.route('/api/stats', methods=['GET'])
@jwt_required()
def get_stats():
    total_thesis = Thesis.query.count()
    completed_thesis = Thesis.query.filter_by(status='completed').count()
    pending_thesis = Thesis.query.filter_by(status='pending').count()
    
    return jsonify({
        'total_thesis': total_thesis,
        'completed_reviews': completed_thesis,
        'pending_reviews': pending_thesis
    })

@app.route('/api/uploads/<filename>')
@jwt_required()
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'message': 'API is working!'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    print("服务器启动在 http://127.0.0.1:5000")
    print("可用的API端点：")
    print("- GET  /")
    print("- GET  /api/test")
    print("- POST /api/register")
    print("- POST /api/login")
    print("- GET  /api/thesis")
    print("- POST /api/thesis")
    app.run(debug=True, host='127.0.0.1', port=5000) 