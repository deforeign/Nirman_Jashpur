import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./Form.css";
import TopBar from "../Components/TopBar.jsx";
export default function TenderForm({ onLogout }) {
  const navigate = useNavigate();

  const { workId } = useParams();



  // Form state
  const [form, setForm] = useState({
    tenderTitle: "",
    department: "",
    issuedDate: "",
    tenderId: "",
    document: null,
    remarks: "",
  });

  // Loading and error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Get authentication token
  function getAuthToken() {
    return localStorage.getItem("authToken");
  }

  useEffect(() => {
    document.title = "निर्माण | निविदा प्रपत्र";
    
    // Debug workID
    console.log("🔍 Tender Form - workID:", workId);
    
    if (!workId) {
      alert("कार्य ID नहीं मिला। कृपया वापस जाएं।");
      navigate(-1);
    }
  }, [workId, navigate]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "document") {
      setForm((prev) => ({ ...prev, document: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!form.tenderTitle.trim()) {
      newErrors.tenderTitle = 'निविदा शीर्षक आवश्यक है';
    }
    
    if (!form.department.trim()) {
      newErrors.department = 'विभाग का नाम आवश्यक है';
    }
    
    if (!form.issuedDate) {
      newErrors.issuedDate = 'जारी तिथि आवश्यक है';
    }
    
    if (!form.tenderId.trim()) {
      newErrors.tenderId = 'निविदा आईडी आवश्यक है';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogout = () => {
    if (window.confirm("क्या आप लॉगआउट करना चाहते हैं?")) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      navigate("/");
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // ✅ Step 1: Form validation
      if (!validateForm()) {
        return;
      }

      // ✅ Step 2: Authentication check
      const authToken = getAuthToken();
      if (!authToken) {
        alert("आपका सत्र समाप्त हो गया है। कृपया पुनः लॉगिन करें।");
        navigate("/login");
        return;
      }

      // ✅ Step 3: WorkID validation
      if (!workId) {
        alert("कार्य ID नहीं मिला। कृपया पेज रीलोड करें।");
        return;
      }

      setIsSubmitting(true);

      // ✅ Step 4: Convert date to ISO format
      const convertToISODate = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toISOString();
      };

      // ✅ Step 5: Prepare payload according to API schema
      const payload = {
        tenderTitle: form.tenderTitle,
        tenderID: form.tenderId,  // Note: API expects 'tenderID', not 'tenderId'
        department: form.department,
        issuedDates: convertToISODate(form.issuedDate), // Note: API expects 'issuedDates'
        remark: form.remarks || ""  // Note: API expects 'remark', not 'remarks'
      };

      // 🔍 Debug logs
      console.log("📤 Submitting tender:");
      console.log("🆔 Work ID:", workId);
      console.log("📋 Payload:", payload);

      // ✅ Step 6: API call with JSON content type
      const response = await axios.post(
        `http://localhost:3000/api/work-proposals/${workId}/tender/start`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
        }
      );

      // ✅ Step 7: Handle document upload separately (if needed)
      if (form.document) {
        try {
          console.log("📁 Document will be handled separately:", form.document.name);
          // You can implement document upload to a separate endpoint if needed
        } catch (fileError) {
          console.warn("⚠️ Document upload failed:", fileError);
        }
      }

      // ✅ Step 8: Success handling
      console.log("✅ Tender started successfully:", response.data);
      alert("निविदा सफलतापूर्वक शुरू की गई!");
      
      // Reset form
      setForm({
        tenderTitle: "",
        department: "",
        issuedDate: "",
        tenderId: "",
        document: null,
        remarks: "",
      });
      
      // Clear file input
      const fileInput = document.getElementById("documentUpload");
      if (fileInput) {
        fileInput.value = "";
      }

      // Navigate back after delay
      setTimeout(() => {
        navigate(-1);
      }, 1500);

    } catch (error) {
      console.error("❌ Tender submission error:", error);
      
      if (error.response) {
        const { status, data } = error.response;
        console.error("📍 Response error:", status, data);
        
        switch (status) {
          case 400:
            if (data.message?.includes('ObjectId')) {
              alert("कार्य ID की समस्या है। कृपया वापस जाकर सही कार्य चुनें।");
              navigate(-1);
            } else {
              alert(`डेटा त्रुटि: ${data.message || 'अवैध डेटा'}`);
            }
            break;
            
          case 401:
            alert("आपका सत्र समाप्त हो गया है। कृपया पुनः लॉगिन करें।");
            localStorage.removeItem("authToken");
            localStorage.removeItem("userData");
            navigate("/login");
            break;
            
          case 403:
            alert("आपको इस कार्य को करने की अनुमति नहीं है।");
            break;
            
          case 404:
            alert("कार्य प्रस्ताव नहीं मिला। हो सकता है यह पहले से हटा दिया गया हो।");
            navigate(-1);
            break;
            
          default:
            alert(`सर्वर त्रुटि (${status}): ${data.message || 'अज्ञात त्रुटि'}`);
        }
      } else if (error.request) {
        console.error("📍 Network error:", error.request);
        alert("नेटवर्क त्रुटि। कृपया अपना इंटरनेट कनेक्शन जांचें।");
      } else {
        console.error("📍 Request setup error:", error.message);
        alert("अनुरोध त्रुटि। कृपया पेज रीलोड करके पुनः प्रयास करें।");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="workorder-page">
      {/* Header */}
      <div className="header">
        <TopBar  />

        <div className="subbar">
          <span className="dot" />
          <h2>निविदा जोड़ें - Work ID: {workId}</h2>
        </div>
      </div>

      {/* Form Card */}
      <div className="wrap">
        <section className="panel">
          <div className="panel-header">
            <h3>निविदा प्रपत्र</h3>
          </div>

          <form className="p-body" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  निविदा शीर्षक <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="tenderTitle"
                  className={`form-input ${errors.tenderTitle ? 'error' : ''}`}
                  placeholder="Construction of CC Road from Panchayat Bhavan to School"
                  value={form.tenderTitle}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
                {errors.tenderTitle && (
                  <span className="error-text">{errors.tenderTitle}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  विभाग <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="department"
                  className={`form-input ${errors.department ? 'error' : ''}`}
                  placeholder="Public Works Department"
                  value={form.department}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
                {errors.department && (
                  <span className="error-text">{errors.department}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  जारी तिथि <span className="req">*</span>
                </label>
                <div className="input-with-icon">
                  <input
                    type="date"
                    name="issuedDate"
                    className={`form-input ${errors.issuedDate ? 'error' : ''}`}
                    value={form.issuedDate}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required
                  />
                  <span className="cal-ic">📅</span>
                </div>
                {errors.issuedDate && (
                  <span className="error-text">{errors.issuedDate}</span>
                )}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  निविदा आईडी <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="tenderId"
                  className={`form-input ${errors.tenderId ? 'error' : ''}`}
                  placeholder="TDR/2025/0789"
                  value={form.tenderId}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
                {errors.tenderId && (
                  <span className="error-text">{errors.tenderId}</span>
                )}
              </div>

              {/* File Upload - Optional */}
              <div className="form-group file-input-wrapper">
                <label>संलग्न दस्तावेज़ (वैकल्पिक)</label>
                <input
                  type="file"
                  name="document"
                  id="documentUpload"
                  className="file-input"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <label htmlFor="documentUpload" className="custom-file-label">
                  फ़ाइल चुनें
                </label>
                <span className="file-name">
                  {form.document ? form.document.name : "कोई फ़ाइल चयनित नहीं"}
                </span>
                <small className="help-text">
                  नोट: दस्तावेज़ अपलोड अलग से संभाला जाएगा
                </small>
              </div>
            </div>

            <div className="form-group full">
              <label className="form-label">टिप्पणी</label>
              <textarea
                name="remarks"
                className="form-input textarea"
                placeholder="Tender issued for road construction with proper drainage system"
                rows={5}
                value={form.remarks}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting || !workId}
              >
                {isSubmitting ? "सबमिट हो रहा है..." : "Submit"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
