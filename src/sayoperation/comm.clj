(ns sayoperation.comm
  (:use (sayoperation config)
        [clojure.contrib.http.agent :only (http-agent)]))

(defn notify [id data]
  (http-agent
   (str *base-url* "/sayop/pub/?id=" id)
   :method "POST"
   :body data))
          
(defn notify-all [data users except]
  (doseq [id (filter (partial not= except) (map key users))]
    (notify id data)))
