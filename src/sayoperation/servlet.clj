(ns sayoperation.servlet
  (:gen-class :extends javax.servlet.http.HttpServlet)
  (:use
   clojure.core compojure.core
   ring.adapter.jetty ring.util.servlet
   (clojure.contrib pprint json str-utils logging)
   [clojure.contrib.http.agent :only (http-agent)]
   (sayoperation core utils persistence validation comm))
  (:require [compojure.route :as route]))

(init-state *games* *users*)

;; compojure routes

(defroutes sayoperation-routes
  (POST "/sayop-svc/user/*" {{id "id"} :params :as request}
        (json-str
         (with-caution [[id] {:id id}]
           (dosync
            (notify-all (json-str {:global-data (global-data)})
                        @*users* id)
            (if (returning-user id)
              (do ;; returning user
                (heard-from id)
                (or (game-state id) {:global-data (global-data)}))
              (do ;; new user
                (def-user id)
                {:global-data (global-data)}))))))
  
  (POST "/sayop-svc/new-game/*" {{id1 "id1" id2 "id2"} :params :as request}
        (json-str
         (with-caution [[id1 id2] {:id1 id1 :id2 id2}]
           (dosync
            (heard-from id1)
            (def-game id1 id2)
            (when (ready? id1)
              (notify id2 (json-str (game-state id2))))
            (game-state id1)))))
  
  (POST "/sayop-svc/update-game/*" request
        
        (json-str
         (let [move-data (read-json (slurp (:body request)))]
           (with-caution [[id1 id2 move] {:id1 (:id1 move-data)
                                          :id2 (:id2 move-data)
                                          :move (:move move-data)}]
             (dosync
              (heard-from id1)
              (let [hst (high-score-team)]
                (update-game id1 id2 move)
                ;; notify everyone if high-score title changed hands
                (when (not= hst (high-score-team))
                  (notify-all (json-str {:global-data (global-data)})
                              @*users* id1)))
              (when (ready? id2)
                (notify id2 (json-str (game-state id2)))))
             (game-state id1)))))
  
  ;; these routes not actual services, just for test
  (GET ["/sayop-svc/test/:id" :id #"[0-9]+"] {{id "id"} :params :as request}
       (let [id (valid {:id id})]
         (str request)))
  (GET "/sayop-svc/test/" request
       (str request))
  (GET "/sayop-svc/users-online/*" {{id "id"} :params :as request}
       (json-str
        (with-caution [[id] {:id id}]
          (dosync (heard-from id))
          (users-online))))
  
  ;; catch any non-existent service here
  (GET "/sayop-svc/*" []
       (json-str {:info "service not found"}))

  ;; other non-existent url patterns
  (route/not-found "Page not found"))

(defservice sayoperation-routes)

(defn launch-server
  "used in dev only"
  []
  (future (run-jetty (var sayoperation-routes) {:port 8080})))
