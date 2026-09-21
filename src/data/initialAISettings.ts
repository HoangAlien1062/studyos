import { AIConversation, AISettingsState } from '../types/ai';

export const INITIAL_AI_SETTINGS: AISettingsState = {
  primaryProvider: 'google',
  fallbackProvider: 'google',
  temperature: 0.7,
  maxTokens: 4096,
  providers: {
    auto: {
      id: 'auto',
      name: 'Tự động chọn (Google Gemini)',
      isEnabled: true,
      apiKey: '',
      model: 'gemini-3.8-flash',
      status: 'connected',
      lastPingMs: 45
    },
    google: {
      id: 'google',
      name: 'Google Gemini',
      isEnabled: true,
      apiKey: '',
      model: 'gemini-3.8-flash',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      status: 'connected',
      lastPingMs: 78
    },
    openai: {
      id: 'openai',
      name: 'OpenAI',
      isEnabled: true,
      apiKey: 'sk-proj-mockStudyOSOpenAIKey001293847',
      model: 'gpt-4o',
      baseUrl: 'https://api.openai.com/v1',
      status: 'connected',
      lastPingMs: 120
    },
    anthropic: {
      id: 'anthropic',
      name: 'Anthropic Claude',
      isEnabled: false,
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
      baseUrl: 'https://api.anthropic.com/v1',
      status: 'disconnected'
    },
    openrouter: {
      id: 'openrouter',
      name: 'OpenRouter',
      isEnabled: false,
      apiKey: '',
      model: 'deepseek/deepseek-r1',
      baseUrl: 'https://openrouter.ai/api/v1',
      status: 'disconnected'
    },
    custom: {
      id: 'custom',
      name: 'Tùy chỉnh Endpoint (Local LLM / Ollama)',
      isEnabled: false,
      apiKey: '',
      model: 'llama3:8b',
      baseUrl: 'http://localhost:11434/v1',
      status: 'disconnected'
    }
  }
};

export const INITIAL_CONVERSATIONS: AIConversation[] = [
  {
    id: 'conv-1',
    title: 'Giải thích định lý Rolle & Ứng dụng',
    mode: 'study',
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-09-15T10:15:00Z',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Bạn hãy giải thích trực quan Định lý Rolle trong Giải tích 1 và cho mình một ví dụ thực tế được không?',
        timestamp: '10:00',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: `Chào bạn! **Định lý Rolle** là một trong những định lý nền tảng quan trọng nhất của phép tính vi phân.

### 1. Phát biểu toán học:
Giả sử hàm số $f(x)$ thỏa mãn 3 điều kiện:
1. $f(x)$ **liên tục** trên đoạn đóng $[a, b]$.
2. $f(x)$ **khả vi** trên khoảng mở $(a, b)$.
3. Giá trị ở hai đầu mút bằng nhau: $f(a) = f(b)$.

Khi đó, tồn tại ít nhất một điểm $c \\in (a, b)$ sao cho:
$$f'(c) = 0$$

### 2. Ý nghĩa trực quan hình học:
Đồ thị hàm số đi từ điểm $(a, f(a))$ đến $(b, f(b))$ với cùng độ cao. Vì đồ thị là một đường cong trơn lượn sóng (khả vi), nên nó bắt buộc phải có ít nhất một đỉnh uốn lượn (cực trị) mà tại đó tiếp tuyến nằm ngang song song với trục hoành $Ox$.

### 3. Ví dụ thực tế:
Tưởng tượng bạn ném một quả bóng thẳng đứng lên trời:
- Lúc xuất phát ở mặt đất: $h(0) = 0$.
- Khi quả bóng rơi lại chạm đất tại thời điểm $T$: $h(T) = 0$.
Theo định lý Rolle, chắc chắn sẽ có thời điểm $t_0 \\in (0, T)$ mà vận tốc $v(t_0) = h'(t_0) = 0$ (chính là đỉnh cao nhất của quỹ đạo bóng).`,
        timestamp: '10:02',
        feedback: 'like'
      }
    ]
  },
  {
    id: 'conv-2',
    title: 'Tối ưu hóa cây AVL trong C++',
    mode: 'question',
    createdAt: '2026-09-16T14:30:00Z',
    updatedAt: '2026-09-16T14:40:00Z',
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'Cho mình xin đoạn mã ngắn gọn quay trái (Left Rotation) cây AVL trong C++.',
        timestamp: '14:30',
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: `Dưới đây là hàm quay trái (Left Rotation) chuẩn cho node $x$ trong cây AVL:

\`\`\`cpp
struct Node {
    int key;
    Node *left, *right;
    int height;
};

int getHeight(Node* n) {
    return n ? n->height : 0;
}

Node* rotateLeft(Node* x) {
    Node* y = x->right;
    Node* T2 = y->left;

    // Thực hiện phép quay
    y->left = x;
    x->right = T2;

    // Cập nhật lại chiều cao của x trước, y sau
    x->height = 1 + std::max(getHeight(x->left), getHeight(x->right));
    y->height = 1 + std::max(getHeight(y->left), getHeight(y->right));

    // y trở thành gốc mới của cây con
    return y;
}
\`\`\`

Độ phức tạp thời gian: $O(1)$.`,
        timestamp: '14:32'
      }
    ]
  }
];
